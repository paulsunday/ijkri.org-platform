import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";

const REVIEWER_EMAIL = "paul.igwegbe@unn.edu.ng";
const TEMPORARY_PASSWORD = "Reviewer@12345";

async function main() {
    const passwordHash = await bcrypt.hash(
        TEMPORARY_PASSWORD,
        12,
    );

    const reviewer = await prisma.user.update({
        where: {
            email: REVIEWER_EMAIL.toLowerCase(),
        },
        data: {
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    console.log("Reviewer account ready:");
    console.log(`Name: ${reviewer.name}`);
    console.log(`Email: ${reviewer.email}`);
    console.log(`Temporary password: ${TEMPORARY_PASSWORD}`);
}

main()
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });