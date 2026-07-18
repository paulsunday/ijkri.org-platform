"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/send-email";
import { prisma } from "@/lib/prisma";
import { createAccountActivationLink } from "@/lib/auth/account-activation";
import { accountActivationEmail } from "@/lib/email/templates";

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value: string) {
    return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /\d/.test(value)
    );
}

export async function registerUser(formData: FormData) {
    const name = String(
        formData.get("name") || "",
    ).trim();

    const email = normalizeEmail(
        String(formData.get("email") || ""),
    );

    const password = String(
        formData.get("password") || "",
    );

    const confirmPassword = String(
        formData.get("confirmPassword") || "",
    );

    const affiliation = String(
        formData.get("affiliation") || "",
    ).trim();

    const country = String(
        formData.get("country") || "",
    ).trim();

    const phone = String(
        formData.get("phone") || "",
    ).trim();

    const orcid = String(
        formData.get("orcid") || "",
    ).trim();

    const acceptedTerms =
        String(formData.get("acceptedTerms") || "") ===
        "true";

    if (!name) {
        redirect(
            "/register?error=Full+name+is+required.",
        );
    }

    if (!email || !validateEmail(email)) {
        redirect(
            "/register?error=Enter+a+valid+email+address.",
        );
    }

    if (!validatePassword(password)) {
        redirect(
            "/register?error=Password+must+contain+at+least+8+characters,+one+uppercase+letter,+one+lowercase+letter+and+one+number.",
        );
    }

    if (password !== confirmPassword) {
        redirect(
            "/register?error=The+passwords+do+not+match.",
        );
    }

    if (!acceptedTerms) {
        redirect(
            "/register?error=You+must+accept+the+terms+and+publication+policies.",
        );
    }

    const existingUser =
        await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                name: true,
            },
        });

    if (existingUser) {
        redirect(
            "/register?error=An+account+with+this+email+already+exists.",
        );
    }

    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
            name: true,
        },
    });

    if (!journal) {
        redirect(
            "/register?error=Registration+is+temporarily+unavailable+because+no+active+journal+was+found.",
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        12,
    );

    const createdUser = await prisma.$transaction(
        async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    affiliation: affiliation || null,
                    country: country || null,
                    phone: phone || null,
                    orcid: orcid || null,
                    isActive: false,
                    emailVerified: null,
                    passwordChangedAt: null,
                },
            });

            await tx.userJournalRole.create({
                data: {
                    userId: user.id,
                    journalId: journal.id,
                    role: "AUTHOR",
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: user.id,
                    action: "CREATE",
                    entity: "User",
                    entityId: user.id,
                    metadata: {
                        event: "PUBLIC_USER_REGISTERED",
                        email: user.email,
                        journalId: journal.id,
                        assignedRole: "AUTHOR",
                    },
                },
            });

            return user;
        },
    );

    const { activationUrl, expiresInHours } =
        await createAccountActivationLink(
            createdUser.id,
        );

    const emailContent =
        accountActivationEmail({
            name: createdUser.name,
            journalName:
                journal.name,
            assignedRole: "AUTHOR",
            activationUrl,
            expiresInHours,
        });

    try {
        await sendEmail({
            to: createdUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });
    } catch (error) {
        console.error(
            "Activation email failed:",
            error,
        );
    }

    redirect(
        "/login?registered=true&activationRequired=true",
    );
}