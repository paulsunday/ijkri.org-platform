import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";
import { UserRole } from "../lib/generated/prisma";

const ADMIN_EMAIL = "admin@ijkri.org";
const TEMPORARY_PASSWORD = "Admin@12345";

async function main() {
    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (!journal) {
        throw new Error(
            "No active journal was found. Create the journal before creating the administrator.",
        );
    }

    const passwordHash = await bcrypt.hash(TEMPORARY_PASSWORD, 12);

    const user = await prisma.user.upsert({
        where: {
            email: ADMIN_EMAIL,
        },

        update: {
            name: "System Administrator",
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
        },

        create: {
            name: "System Administrator",
            email: ADMIN_EMAIL,
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
        },
    });

    await prisma.userJournalRole.upsert({
        where: {
            userId_journalId_role: {
                userId: user.id,
                journalId: journal.id,
                role: UserRole.SUPER_ADMIN,
            },
        },

        update: {},

        create: {
            userId: user.id,
            journalId: journal.id,
            role: UserRole.SUPER_ADMIN,
        },
    });

    console.log("");
    console.log("========================================");
    console.log("SUPER ADMIN ACCOUNT READY");
    console.log("========================================");
    console.log(`Journal: ${journal.name}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Temporary password: ${TEMPORARY_PASSWORD}`);
    console.log("Role: SUPER_ADMIN");
    console.log("========================================");
    console.log("");
    console.log("Change the temporary password after login.");
}

main()
    .catch((error: unknown) => {
        console.error("");
        console.error("Failed to create the Super Admin account:");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });