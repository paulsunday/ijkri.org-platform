import { createHash } from "node:crypto";

import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function createLoginIdentifier(email: string, request: Request): string {
  const clientIp = getClientIp(request);

  /*
   * Hash the email and IP address so personally identifiable
   * information is not stored directly in Redis rate-limit keys.
   */
  return createHash("sha256").update(`${email}:${clientIp}`).digest("hex");
}

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),

  password: z.string().min(8).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET,

  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Email and password",

      credentials: {
        email: {
          label: "Email address",
          type: "email",
          placeholder: "name@example.com",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, request) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        const loginIdentifier = createLoginIdentifier(email, request);

        try {
          await enforceRateLimit(
            "login",
            loginIdentifier,
          );
        } catch (error) {
          logger.warn("Login request blocked by rate limiter", {
            event: "LOGIN_RATE_LIMITED",
            identifier: loginIdentifier,
          });

          return null;
        }
        /*
         * Keep the response generic. Do not reveal whether
         * the email exists, the password is incorrect, or
         * the request has been rate limited.
         */

        const user = await prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            isActive: true,
            emailVerified: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            passwordChangedAt: true,

            roles: {
              select: {
                role: true,
                journalId: true,
              },
            },
          },
        });

        /*
         * Keep all authentication failures generic so an
         * attacker cannot confirm whether an account exists.
         */
        if (
          !user ||
          !user.passwordHash ||
          !user.isActive ||
          !user.emailVerified
        ) {
          return null;
        }

        const now = new Date();

        /*
         * Reject the login while the temporary account lock
         * remains active.
         */
        if (user.lockedUntil && user.lockedUntil > now) {
          return null;
        }

        /*
         * Clear an expired account lock before checking the
         * new password.
         */
        if (user.lockedUntil && user.lockedUntil <= now) {
          await prisma.user.update({
            where: {
              id: user.id,
            },

            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          });

          user.failedLoginAttempts = 0;
          user.lockedUntil = null;
        }

        const passwordIsCorrect = await compare(password, user.passwordHash);

        if (!passwordIsCorrect) {
          const nextFailedAttempts = user.failedLoginAttempts + 1;

          const shouldLockAccount =
            nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

          const lockedUntil = shouldLockAccount
            ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000)
            : null;

          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: {
                id: user.id,
              },

              data: {
                failedLoginAttempts: nextFailedAttempts,
                lockedUntil,
              },
            });

            await tx.activityLog.create({
              data: {
                userId: user.id,
                action: "UPDATE",
                entity: "User",
                entityId: user.id,

                metadata: {
                  event: shouldLockAccount
                    ? "ACCOUNT_LOCKED_AFTER_FAILED_LOGINS"
                    : "LOGIN_FAILED",

                  failedLoginAttempts: nextFailedAttempts,

                  lockedUntil: lockedUntil?.toISOString() ?? null,
                },
              },
            });
          });

          return null;
        }

        /*
         * A successful login clears temporary restrictions,
         * updates the last-login timestamp, and creates an
         * audit record.
         */
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLogin: now,
            },
          });

          await tx.activityLog.create({
            data: {
              userId: user.id,
              action: "LOGIN",
              entity: "User",
              entityId: user.id,

              metadata: {
                event: "LOGIN_SUCCESSFUL",
              },
            },
          });
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,

          roles: user.roles.map((assignment) => ({
            role: assignment.role,
            journalId: assignment.journalId,
          })),

          passwordChangedAt: user.passwordChangedAt
            ? user.passwordChangedAt.toISOString()
            : null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      /*
       * The user object is available immediately after a
       * successful login. Store the user's ID, roles, and
       * password-change timestamp in the JWT.
       */
      if (user) {
        token.userId = user.id;

        token.roles =
          "roles" in user && Array.isArray(user.roles) ? user.roles : [];

        token.passwordChangedAt =
          "passwordChangedAt" in user ? user.passwordChangedAt : null;

        return token;
      }

      if (!token.userId) {
        return token;
      }

      /*
       * Revalidate security-sensitive account information
       * against the database whenever the JWT is evaluated.
       */
      const currentUser = await prisma.user.findUnique({
        where: {
          id: String(token.userId),
        },

        select: {
          isActive: true,
          passwordChangedAt: true,

          roles: {
            select: {
              role: true,
              journalId: true,
            },
          },
        },
      });

      /*
       * Invalidate the session if the account was deleted
       * or disabled.
       */
      if (!currentUser || !currentUser.isActive) {
        return null;
      }

      const databasePasswordChangedAt = currentUser.passwordChangedAt
        ? currentUser.passwordChangedAt.toISOString()
        : null;

      const tokenPasswordChangedAt =
        typeof token.passwordChangedAt === "string"
          ? token.passwordChangedAt
          : null;

      /*
       * Invalidate an existing session when the password has
       * changed since the JWT was issued.
       */
      if (databasePasswordChangedAt !== tokenPasswordChangedAt) {
        return null;
      }

      /*
       * Refresh role assignments so permission changes take
       * effect during an existing session.
       */
      token.roles = currentUser.roles;
      token.passwordChangedAt = databasePasswordChangedAt;

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);

        session.user.roles = Array.isArray(token.roles) ? token.roles : [];
      }

      return session;
    },

    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },

  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;

      if (!token?.userId) {
        return;
      }

      try {
        await prisma.activityLog.create({
          data: {
            userId: String(token.userId),
            action: "LOGOUT",
            entity: "User",
            entityId: String(token.userId),

            metadata: {
              event: "LOGOUT_SUCCESSFUL",
            },
          },
        });
      } catch (error) {
        logger.error("Logout activity logging failed", error, {
          event: "LOGOUT_ACTIVITY_LOGGING_FAILED",
        });
      }
    },
  },
});
