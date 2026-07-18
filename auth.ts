import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email()
        .transform((value) =>
            value.toLowerCase(),
        ),

    password: z
        .string()
        .min(8)
        .max(128),
});

export const {
    handlers,
    auth,
    signIn,
    signOut,
} = NextAuth({
    secret:
        process.env.AUTH_SECRET ||
        process.env.BETTER_AUTH_SECRET,

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
                    placeholder:
                        "name@example.com",
                },

                password: {
                    label: "Password",
                    type: "password",
                },
            },

            async authorize(credentials) {
                const parsedCredentials =
                    loginSchema.safeParse(
                        credentials,
                    );

                if (!parsedCredentials.success) {
                    return null;
                }

                const {
                    email,
                    password,
                } = parsedCredentials.data;

                const user =
                    await prisma.user.findUnique({
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
                 * Keep the public response generic so that
                 * attackers cannot determine whether an
                 * email address exists.
                 */
                if (
                    !user ||
                    !user.passwordHash ||
                    !user.isActive
                ) {
                    return null;
                }

                const now = new Date();

                /*
                 * Reject login while the temporary lock
                 * remains active.
                 */
                if (
                    user.lockedUntil &&
                    user.lockedUntil > now
                ) {
                    return null;
                }

                /*
                 * A previous lockout has expired. Clear the
                 * old lock and failed-attempt counter before
                 * evaluating the new login attempt.
                 */
                if (
                    user.lockedUntil &&
                    user.lockedUntil <= now
                ) {
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

                const passwordIsCorrect =
                    await compare(
                        password,
                        user.passwordHash,
                    );

                if (!passwordIsCorrect) {
                    const nextFailedAttempts =
                        user.failedLoginAttempts +
                        1;

                    const shouldLockAccount =
                        nextFailedAttempts >=
                        MAX_FAILED_LOGIN_ATTEMPTS;

                    const lockedUntil =
                        shouldLockAccount
                            ? new Date(
                                Date.now() +
                                ACCOUNT_LOCK_MINUTES *
                                60 *
                                1000,
                            )
                            : null;

                    await prisma.$transaction(
                        async (tx) => {
                            await tx.user.update({
                                where: {
                                    id: user.id,
                                },

                                data: {
                                    failedLoginAttempts:
                                        nextFailedAttempts,

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
                                        event:
                                            shouldLockAccount
                                                ? "ACCOUNT_LOCKED_AFTER_FAILED_LOGINS"
                                                : "LOGIN_FAILED",

                                        failedLoginAttempts:
                                            nextFailedAttempts,

                                        lockedUntil:
                                            lockedUntil?.toISOString() ??
                                            null,
                                    },
                                },
                            });
                        },
                    );

                    return null;
                }

                /*
                 * Successful login resets all temporary
                 * authentication restrictions.
                 */
                await prisma.$transaction(
                    async (tx) => {
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
                                action: "UPDATE",
                                entity: "User",
                                entityId: user.id,

                                metadata: {
                                    event:
                                        "LOGIN_SUCCESSFUL",
                                },
                            },
                        });
                    },
                );

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,

                    roles: user.roles.map(
                        (assignment) => ({
                            role:
                                assignment.role,
                            journalId:
                                assignment.journalId,
                        }),
                    ),

                    passwordChangedAt:
                        user.passwordChangedAt
                            ? user.passwordChangedAt.toISOString()
                            : null,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({
            token,
            user,
            trigger,
        }) {
            if (user) {
                token.userId = user.id;

                token.roles =
                    "roles" in user &&
                        Array.isArray(user.roles)
                        ? user.roles
                        : [];

                token.passwordChangedAt =
                    "passwordChangedAt" in user
                        ? user.passwordChangedAt
                        : null;
            }

            /*
             * Refresh the database-backed security status
             * when NextAuth updates the session.
             */
            if (
                trigger === "update" &&
                token.userId
            ) {
                const currentUser =
                    await prisma.user.findUnique({
                        where: {
                            id: String(
                                token.userId,
                            ),
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

                if (
                    !currentUser ||
                    !currentUser.isActive
                ) {
                    return null;
                }

                token.roles =
                    currentUser.roles;

                token.passwordChangedAt =
                    currentUser.passwordChangedAt
                        ? currentUser.passwordChangedAt.toISOString()
                        : null;
            }

            return token;
        },

        async session({
            session,
            token,
        }) {
            if (
                session.user &&
                token.userId
            ) {
                session.user.id =
                    String(token.userId);

                session.user.roles =
                    Array.isArray(token.roles)
                        ? token.roles
                        : [];
            }

            return session;
        },

        authorized({ auth }) {
            return Boolean(auth?.user);
        },
    },

    events: {
        async signOut(message) {
            const token =
                "token" in message
                    ? message.token
                    : null;

            if (!token?.userId) {
                return;
            }

            try {
                await prisma.activityLog.create({
                    data: {
                        userId: String(
                            token.userId,
                        ),
                        action: "UPDATE",
                        entity: "User",
                        entityId: String(
                            token.userId,
                        ),

                        metadata: {
                            event:
                                "LOGOUT_SUCCESSFUL",
                        },
                    },
                });
            } catch (error) {
                console.error(
                    "Logout activity logging failed:",
                    error,
                );
            }
        },
    },
});