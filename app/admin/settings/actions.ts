"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";

const REVIEW_TYPES = [
    "DOUBLE_BLIND",
    "SINGLE_BLIND",
    "OPEN",
] as const;

const CURRENCIES = ["USD"] as const;

const ISSN_PATTERN = /^\d{4}-\d{3}[\dX]$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function verifyJournalSettingsPermission(
    administratorId: string,
    journalId: string,
) {
    const administrator = await prisma.user.findUnique({
        where: {
            id: administratorId,
        },
        select: {
            roles: {
                select: {
                    role: true,
                    journalId: true,
                },
            },
        },
    });

    if (!administrator) {
        throw new Error("Administrator account not found.");
    }

    const isSuperAdmin = administrator.roles.some(
        (roleRecord) => roleRecord.role === "SUPER_ADMIN",
    );

    if (isSuperAdmin) {
        return;
    }

    const hasJournalPermission = administrator.roles.some(
        (roleRecord) =>
            roleRecord.journalId === journalId &&
            ADMIN_ROLES.includes(roleRecord.role),
    );

    if (!hasJournalPermission) {
        throw new Error(
            "You do not have administrative permission for this journal.",
        );
    }
}

function requiredText(
    formData: FormData,
    field: string,
    label: string,
): string {
    const value = String(
        formData.get(field) || "",
    ).trim();

    if (!value) {
        throw new Error(`${label} is required.`);
    }

    return value;
}

function optionalText(
    formData: FormData,
    field: string,
): string | null {
    const value = String(
        formData.get(field) || "",
    ).trim();

    return value || null;
}

function optionalIssn(
    formData: FormData,
    field: string,
    label: string,
): string | null {
    const value = optionalText(formData, field);

    if (value && !ISSN_PATTERN.test(value)) {
        throw new Error(
            `${label} must be in the format 0000-000X.`,
        );
    }

    return value;
}

function optionalEmail(
    formData: FormData,
    field: string,
    label: string,
): string | null {
    const value = optionalText(formData, field);

    if (value && !EMAIL_PATTERN.test(value)) {
        throw new Error(
            `${label} must be a valid email address.`,
        );
    }

    return value;
}

function optionalUrl(
    formData: FormData,
    field: string,
    label: string,
): string | null {
    const value = optionalText(formData, field);

    if (!value) {
        return null;
    }

    try {
        const parsed = new URL(value);

        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {
            throw new Error("invalid protocol");
        }
    } catch {
        throw new Error(
            `${label} must be a valid URL starting with http:// or https://.`,
        );
    }

    return value;
}

function optionalLinkUrl(
    formData: FormData,
    field: string,
    label: string,
): string | null {
    const value = optionalText(formData, field);

    if (!value) {
        return null;
    }

    if (value.startsWith("/")) {
        return value;
    }

    try {
        const parsed = new URL(value);

        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {
            throw new Error("invalid protocol");
        }
    } catch {
        throw new Error(
            `${label} must be a relative path (starting with /) or a valid URL starting with http:// or https://.`,
        );
    }

    return value;
}

function optionalDate(
    formData: FormData,
    field: string,
    label: string,
): Date | null {
    const value = optionalText(formData, field);

    if (!value) {
        return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${label} must be a valid date.`);
    }

    return parsed;
}

function nonNegativeAmount(
    formData: FormData,
    field: string,
    label: string,
): Prisma.Decimal {
    const raw = String(
        formData.get(field) || "",
    ).trim();

    const numericValue = Number(raw || 0);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error(
            `${label} must be a non-negative number.`,
        );
    }

    return new Prisma.Decimal(numericValue);
}

function optionalPercentage(
    formData: FormData,
    field: string,
    label: string,
): number | null {
    const raw = String(
        formData.get(field) || "",
    ).trim();

    if (!raw) {
        return null;
    }

    const numericValue = Number(raw);

    if (
        !Number.isFinite(numericValue) ||
        numericValue < 0 ||
        numericValue > 100
    ) {
        throw new Error(
            `${label} must be a number between 0 and 100.`,
        );
    }

    return Math.round(numericValue);
}

export async function updateJournalSettings(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator = await requireAnyActionRole(
        ADMIN_ROLES,
    );

    const journalId = String(
        formData.get("journalId") || "",
    ).trim();

    if (!journalId) {
        throw new Error("Journal ID is missing.");
    }

    await verifyJournalSettingsPermission(
        administrator.id,
        journalId,
    );

    const journal = await prisma.journal.findUnique({
        where: {
            id: journalId,
        },
        select: {
            id: true,
        },
    });

    if (!journal) {
        throw new Error("Journal not found.");
    }

    const name = requiredText(
        formData,
        "name",
        "Journal name",
    );

    const shortName = requiredText(
        formData,
        "shortName",
        "Short name",
    );

    const issnPrint = optionalIssn(
        formData,
        "issnPrint",
        "Print ISSN",
    );

    const issnOnline = optionalIssn(
        formData,
        "issnOnline",
        "Online ISSN",
    );

    const contactEmail = optionalEmail(
        formData,
        "contactEmail",
        "Contact email",
    );

    const websiteUrl = optionalUrl(
        formData,
        "websiteUrl",
        "Website URL",
    );

    const logo = optionalUrl(
        formData,
        "logo",
        "Logo URL",
    );

    const isActive =
        formData.get("isActive") === "on";

    const apcAmount = nonNegativeAmount(
        formData,
        "apcAmount",
        "Article processing charge",
    );

    const subscriptionAmount = nonNegativeAmount(
        formData,
        "subscriptionAmount",
        "Subscription amount",
    );

    const articlePrice = nonNegativeAmount(
        formData,
        "articlePrice",
        "Single article price",
    );

    const currencyValue = String(
        formData.get("currency") || "",
    ).trim();

    if (
        !CURRENCIES.includes(
            currencyValue as (typeof CURRENCIES)[number],
        )
    ) {
        throw new Error("Invalid currency selected.");
    }

    const submissionOpen =
        formData.get("submissionOpen") === "on";

    const reviewTypeValue = String(
        formData.get("reviewType") || "",
    ).trim();

    if (
        !REVIEW_TYPES.includes(
            reviewTypeValue as (typeof REVIEW_TYPES)[number],
        )
    ) {
        throw new Error("Invalid review type selected.");
    }

    const plagiarismThreshold = optionalPercentage(
        formData,
        "plagiarismThreshold",
        "Plagiarism threshold",
    );

    const defaultLanguage = requiredText(
        formData,
        "defaultLanguage",
        "Default language",
    );

    const homepageBanner = optionalUrl(
        formData,
        "homepageBanner",
        "Homepage banner URL",
    );

    const contactAddress = optionalText(
        formData,
        "contactAddress",
    );

    const copyrightPolicy = optionalText(
        formData,
        "copyrightPolicy",
    );

    const license = optionalText(
        formData,
        "license",
    );

    const footerText = optionalText(
        formData,
        "footerText",
    );

    const theme = optionalText(
        formData,
        "theme",
    );

    const cfpEnabled =
        formData.get("cfpEnabled") === "on";

    const cfpTitle = optionalText(formData, "cfpTitle");

    const cfpMessage = optionalText(
        formData,
        "cfpMessage",
    );

    const cfpButtonText = optionalText(
        formData,
        "cfpButtonText",
    );

    const cfpButtonUrl = optionalLinkUrl(
        formData,
        "cfpButtonUrl",
        "Button link",
    );

    const cfpDeadline = optionalDate(
        formData,
        "cfpDeadline",
        "Submission deadline",
    );

    if (
        cfpEnabled &&
        (!cfpTitle ||
            !cfpMessage ||
            !cfpButtonText ||
            !cfpButtonUrl)
    ) {
        throw new Error(
            "Headline, message, button text, and button link are required to show the call for papers pop-up.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.journal.update({
            where: {
                id: journalId,
            },
            data: {
                name,
                shortName,
                issnPrint,
                issnOnline,
                contactEmail,
                websiteUrl,
                logo,
                isActive,
                apcAmount,
                subscriptionAmount,
                articlePrice,
                currency: currencyValue as
                    (typeof CURRENCIES)[number],
            },
        });

        await tx.journalSettings.upsert({
            where: {
                journalId,
            },
            create: {
                journalId,
                submissionOpen,
                reviewType: reviewTypeValue,
                plagiarismThreshold,
                defaultLanguage,
                homepageBanner,
                contactAddress,
                copyrightPolicy,
                license,
                footerText,
                theme,
                cfpEnabled,
                cfpTitle,
                cfpMessage,
                cfpButtonText,
                cfpButtonUrl,
                cfpDeadline,
            },
            update: {
                submissionOpen,
                reviewType: reviewTypeValue,
                plagiarismThreshold,
                defaultLanguage,
                homepageBanner,
                contactAddress,
                copyrightPolicy,
                license,
                footerText,
                theme,
                cfpEnabled,
                cfpTitle,
                cfpMessage,
                cfpButtonText,
                cfpButtonUrl,
                cfpDeadline,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Journal",
                entityId: journalId,
                metadata: {
                    event: "JOURNAL_SETTINGS_UPDATED",
                    journalId,
                    name,
                    shortName,
                    isActive,
                    submissionOpen,
                    reviewType: reviewTypeValue,
                },
            },
        });
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/journals");
    revalidatePath("/");
    revalidatePath("/current-issue");
    revalidatePath("/archives");

    return "Journal settings were saved successfully.";
    });
}
