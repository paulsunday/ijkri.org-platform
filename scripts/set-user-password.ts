import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { hash } from "bcryptjs";

// Next.js loads .env.local automatically, but standalone scripts do not.
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath)) {
    config({ path: envLocalPath });
} else {
    config({ path: envPath });
}

async function main() {
    const email = process.argv[2]?.trim().toLowerCase();
    const password = process.argv[3];

    if (!email || !password) {
        throw new Error(
            'Usage: npx tsx scripts/set-user-password.ts "email@example.com" "Password123!"',
        );
    }

    if (password.length < 8) {
        throw new Error("Password must contain at least 8 characters.");
    }

    // Import Prisma only after the environment file has been loaded.
    const { prisma } = await import("../lib/prisma");

    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (!user) {
        throw new Error(`No user was found with email: ${email}`);
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            passwordHash,
            passwordChangedAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            isActive: true,
        },
    });

    console.log(`Password updated successfully for ${user.email}`);

    await prisma.$disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});