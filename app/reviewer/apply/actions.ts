"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { assertHoneypotEmpty } from "@/lib/security/honeypot";

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

function parseOptionalInteger(
    value: FormDataEntryValue | null,
) {
    const text = String(value || "").trim();

    if (!text) {
        return null;
    }

    const number = Number(text);

    if (!Number.isInteger(number) || number < 0) {
        throw new Error(
            "Experience and publication values must be positive whole numbers.",
        );
    }

    return number;
}

function validateOptionalUrl(
    value: string,
    fieldName: string,
) {
    if (!value) {
        return null;
    }

    try {
        new URL(value);
    } catch {
        throw new Error(
            `Enter a valid URL for ${fieldName}.`,
        );
    }

    return value;
}

export async function submitReviewerApplication(
    formData: FormData,
) {
    assertHoneypotEmpty(formData, {
        event: "REVIEWER_APPLICATION",
    });

    const fullName = String(
        formData.get("fullName") || "",
    ).trim();

    const email = normalizeEmail(
        String(formData.get("email") || ""),
    );

    const phone = String(
        formData.get("phone") || "",
    ).trim();

    const affiliation = String(
        formData.get("affiliation") || "",
    ).trim();

    const department = String(
        formData.get("department") || "",
    ).trim();

    const country = String(
        formData.get("country") || "",
    ).trim();

    const currentPosition = String(
        formData.get("currentPosition") || "",
    ).trim();

    const highestQualification = String(
        formData.get("highestQualification") || "",
    ).trim();

    const primaryField = String(
        formData.get("primaryField") || "",
    ).trim();

    const secondaryFields = String(
        formData.get("secondaryFields") || "",
    ).trim();

    const areasOfExpertise = String(
        formData.get("areasOfExpertise") || "",
    ).trim();

    const researchInterests = String(
        formData.get("researchInterests") || "",
    ).trim();

    const orcid = String(
        formData.get("orcid") || "",
    ).trim();

    const googleScholarUrl = String(
        formData.get("googleScholarUrl") || "",
    ).trim();

    const researchGateUrl = String(
        formData.get("researchGateUrl") || "",
    ).trim();

    const scopusId = String(
        formData.get("scopusId") || "",
    ).trim();

    const webOfScienceId = String(
        formData.get("webOfScienceId") || "",
    ).trim();

    const profileUrl = String(
        formData.get("profileUrl") || "",
    ).trim();

    const journalsReviewedFor = String(
        formData.get("journalsReviewedFor") || "",
    ).trim();

    const preferredTopics = String(
        formData.get("preferredTopics") || "",
    ).trim();

    const availability = String(
        formData.get("availability") || "",
    ).trim();

    const professionalStatement = String(
        formData.get("professionalStatement") || "",
    ).trim();

    const cvUrl = String(
        formData.get("cvUrl") || "",
    ).trim();

    const recentPublicationUrl = String(
        formData.get("recentPublicationUrl") || "",
    ).trim();

    const conflictDeclaration =
        String(
            formData.get("conflictDeclaration") || "",
        ) === "true";

    const ethicsAgreement =
        String(
            formData.get("ethicsAgreement") || "",
        ) === "true";

    const dataConsent =
        String(formData.get("dataConsent") || "") ===
        "true";

    if (!fullName) {
        throw new Error("Full name is required.");
    }

    if (!email) {
        throw new Error("Email address is required.");
    }

    if (!affiliation) {
        throw new Error(
            "Institution or affiliation is required.",
        );
    }

    if (!country) {
        throw new Error("Country is required.");
    }

    if (!currentPosition) {
        throw new Error(
            "Current academic or professional position is required.",
        );
    }

    if (!highestQualification) {
        throw new Error(
            "Highest qualification is required.",
        );
    }

    if (!primaryField) {
        throw new Error(
            "Primary field of expertise is required.",
        );
    }

    if (!areasOfExpertise) {
        throw new Error(
            "Areas of expertise are required.",
        );
    }

    if (!professionalStatement) {
        throw new Error(
            "A professional statement is required.",
        );
    }

    if (
        !conflictDeclaration ||
        !ethicsAgreement ||
        !dataConsent
    ) {
        throw new Error(
            "All reviewer declarations must be accepted.",
        );
    }

    const yearsResearchExperience =
        parseOptionalInteger(
            formData.get("yearsResearchExperience"),
        );

    if (yearsResearchExperience === null) {
        throw new Error(
            "Years of research experience is required.",
        );
    }

    const yearsReviewExperience =
        parseOptionalInteger(
            formData.get("yearsReviewExperience"),
        );

    const publicationCount =
        parseOptionalInteger(
            formData.get("publicationCount"),
        );

    const validatedGoogleScholarUrl =
        validateOptionalUrl(
            googleScholarUrl,
            "Google Scholar",
        );

    const validatedResearchGateUrl =
        validateOptionalUrl(
            researchGateUrl,
            "ResearchGate",
        );

    const validatedProfileUrl =
        validateOptionalUrl(
            profileUrl,
            "professional profile",
        );

    const validatedCvUrl = validateOptionalUrl(
        cvUrl,
        "CV",
    );

    const validatedPublicationUrl =
        validateOptionalUrl(
            recentPublicationUrl,
            "recent publication",
        );

    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
        },
    });

    if (!journal) {
        throw new Error(
            "Reviewer applications are temporarily unavailable because no active journal was found.",
        );
    }

    const existingApplication =
        await prisma.reviewerApplication.findUnique({
            where: {
                journalId_email: {
                    journalId: journal.id,
                    email,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });

    if (existingApplication) {
        redirect(
            `/reviewer/apply?existing=${existingApplication.status}`,
        );
    }

    const user = await prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            id: true,
        },
    });

    await prisma.reviewerApplication.create({
        data: {
            journalId: journal.id,
            userId: user?.id || null,
            fullName,
            email,
            phone: phone || null,
            affiliation,
            department: department || null,
            country,
            currentPosition,
            highestQualification,
            primaryField,
            secondaryFields: secondaryFields || null,
            areasOfExpertise,
            researchInterests:
                researchInterests || null,
            orcid: orcid || null,
            googleScholarUrl:
                validatedGoogleScholarUrl,
            researchGateUrl:
                validatedResearchGateUrl,
            scopusId: scopusId || null,
            webOfScienceId:
                webOfScienceId || null,
            profileUrl: validatedProfileUrl,
            yearsResearchExperience,
            yearsReviewExperience,
            publicationCount,
            journalsReviewedFor:
                journalsReviewedFor || null,
            preferredTopics:
                preferredTopics || null,
            availability: availability || null,
            professionalStatement,
            cvUrl: validatedCvUrl,
            recentPublicationUrl:
                validatedPublicationUrl,
            conflictDeclaration,
            ethicsAgreement,
            dataConsent,
            status: "PENDING",
        },
    });

    redirect(
        "/reviewer/apply?submitted=true",
    );
}
