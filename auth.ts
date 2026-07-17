import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
});
export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.BETTER_AUTH_SECRET,

    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 8,
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

            async authorize(credentials) {
                const parsedCredentials = loginSchema.safeParse(credentials);

                if (!parsedCredentials.success) {
                    return null;
                }

                const email = parsedCredentials.data.email.toLowerCase();
                const password = parsedCredentials.data.password;

                const user = await prisma.user.findUnique({
                    where: {
                        email,
                    },
                });

                if (!user || !user.passwordHash || !user.isActive) {
                    return null;
                }

                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    return null;
                }

                const passwordIsCorrect = await compare(
                    password,
                    user.passwordHash,
                );

                if (!passwordIsCorrect) {
                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },
                        data: {
                            failedLoginAttempts: {
                                increment: 1,
                            },
                        },
                    });

                    return null;
                }

                await prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        lastLogin: new Date(),
                    },
                });

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.userId = user.id;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user && token.userId) {
                session.user.id = String(token.userId);
            }

            return session;
        },
    },
});