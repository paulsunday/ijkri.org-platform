import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";

const EMAIL = "test.student@example.com";
const PASSWORD = "TestStudent123!";

async function main() {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    const user = await prisma.user.upsert({
        where: {
            email: EMAIL,
        },

        update: {
            name: "Test Student",
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
        },

        create: {
            name: "Test Student",
            email: EMAIL,
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
        },
    });

    console.log(`Test student ready: ${user.email} / ${PASSWORD}`);

    await prisma.$disconnect();
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
