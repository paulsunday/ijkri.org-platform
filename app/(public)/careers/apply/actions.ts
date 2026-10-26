"use server";

import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/send-email";
import { careerApplicationReceivedEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { assertHoneypotEmpty } from "@/lib/security/honeypot";

const ALLOWED_POSITIONS = [
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "REVIEWER",
    "COPYEDITOR",
    "PROOFREADER",
    "TYPESETTER",
    "EDITORIAL_ASSISTANT",
] as const;

type AllowedPosition =
    (typeof ALLOWED_POSITIONS)[number];

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value,
    );
}

function parseRequiredInteger(
    value: FormDataEntryValue | null,
    fieldName: string,
) {
    const text = String(value || "").trim();
    const number = Number(text);

    if (
        !text ||
        !Number.isInteger(number) ||
        number < 0
    ) {
        throw new Error(
            `${fieldName} must be a non-negative whole number.`,
        );
    }

    return number;
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
            "Publication count must be a non-negative whole number.",
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
        const url = new URL(value);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            throw new Error();
        }
    } catch {
        throw new Error(
            `Enter a valid HTTP or HTTPS URL for ${fieldName}.`,
        );
    }

    return value;
}

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

export async function submitCareerApplication(
    formData: FormData,
) {
    assertHoneypotEmpty(formData, {
        event: "CAREER_APPLICATION",
    });

    const position = String(
        formData.get("position") || "",
    ).trim();

    const fullName = String(
        formData.get("fullName") || "",
    ).trim();

    const email = normalizeEmail(
        String(formData.get("email") || ""),
    );

    const phone = String(
        formData.get("phone") || "",
    ).trim();

    const country = String(
        formData.get("country") || "",
    ).trim();

    const affiliation = String(
        formData.get("affiliation") || "",
    ).trim();

    const department = String(
        formData.get("department") || "",
    ).trim();

    const currentPosition = String(
        formData.get("currentPosition") || "",
    ).trim();

    const highestQualification = String(
        formData.get("highestQualification") || "",
    ).trim();

    const fieldOfStudy = String(
        formData.get("fieldOfStudy") || "",
    ).trim();

    const areasOfExpertise = String(
        formData.get("areasOfExpertise") || "",
    ).trim();

    const professionalSkills = String(
        formData.get("professionalSkills") || "",
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

    const linkedinUrl = String(
        formData.get("linkedinUrl") || "",
    ).trim();

    const scopusId = String(
        formData.get("scopusId") || "",
    ).trim();

    const webOfScienceId = String(
        formData.get("webOfScienceId") || "",
    ).trim();

    const cvUrl = String(
        formData.get("cvUrl") || "",
    ).trim();

    const coverLetterUrl = String(
        formData.get("coverLetterUrl") || "",
    ).trim();

    const certificatesUrl = String(
        formData.get("certificatesUrl") || "",
    ).trim();

    const portfolioUrl = String(
        formData.get("portfolioUrl") || "",
    ).trim();

    const professionalStatement = String(
        formData.get("professionalStatement") || "",
    ).trim();

    const availability = String(
        formData.get("availability") || "",
    ).trim();

    const salaryExpectation = String(
        formData.get("salaryExpectation") || "",
    ).trim();

    const consentAccepted =
        String(
            formData.get("consentAccepted") || "",
        ) === "true";

    const declarationAccepted =
        String(
            formData.get("declarationAccepted") || "",
        ) === "true";

    if (
        !ALLOWED_POSITIONS.includes(
            position as AllowedPosition,
        )
    ) {
        throw new Error(
            "Select a valid position.",
        );
    }

    if (fullName.length < 3) {
        throw new Error(
            "Enter your full name.",
        );
    }

    if (!email || !isValidEmail(email)) {
        throw new Error(
            "Enter a valid email address.",
        );
    }

    if (!country) {
        throw new Error(
            "Country is required.",
        );
    }

    if (!highestQualification) {
        throw new Error(
            "Highest qualification is required.",
        );
    }

    if (professionalStatement.length < 50) {
        throw new Error(
            "Your professional statement must contain at least 50 characters.",
        );
    }

    if (
        !consentAccepted ||
        !declarationAccepted
    ) {
        throw new Error(
            "All declarations must be accepted.",
        );
    }

    const yearsExperience =
        parseRequiredInteger(
            formData.get("yearsExperience"),
            "Years of experience",
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

    const validatedLinkedinUrl =
        validateOptionalUrl(
            linkedinUrl,
            "LinkedIn",
        );

    const validatedCvUrl =
        validateOptionalUrl(
            cvUrl,
            "CV",
        );

    const validatedCoverLetterUrl =
        validateOptionalUrl(
            coverLetterUrl,
            "cover letter",
        );

    const validatedCertificatesUrl =
        validateOptionalUrl(
            certificatesUrl,
            "certificates",
        );

    const validatedPortfolioUrl =
        validateOptionalUrl(
            portfolioUrl,
            "portfolio",
        );

    const journal =
        await prisma.journal.findFirst({
            where: {
                isActive: true,
            },

            orderBy: {
                createdAt: "asc",
            },

            select: {
                id: true,
                name: true,
                shortName: true,
            },
        });

    if (!journal) {
        throw new Error(
            "Career applications are temporarily unavailable because no active journal was found.",
        );
    }

    const existingUser =
        await prisma.user.findUnique({
            where: {
                email,
            },

            select: {
                id: true,
            },
        });

    const duplicate =
        await prisma.careerApplication.findFirst({
            where: {
                journalId: journal.id,
                email,
                position:
                    position as AllowedPosition,

                status: {
                    in: [
                        "PENDING",
                        "UNDER_REVIEW",
                        "SHORTLISTED",
                        "INTERVIEW_SCHEDULED",
                    ],
                },
            },

            select: {
                id: true,
                status: true,
            },
        });

    if (duplicate) {
        redirect(
            `/careers/apply?existing=${encodeURIComponent(
                duplicate.status,
            )}`,
        );
    }

    const application =
        await prisma.careerApplication.create({
            data: {
                journalId: journal.id,
                userId: existingUser?.id || null,
                position:
                    position as AllowedPosition,
                fullName,
                email,
                phone: phone || null,
                country,
                affiliation: affiliation || null,
                department: department || null,
                currentPosition:
                    currentPosition || null,
                highestQualification,
                fieldOfStudy:
                    fieldOfStudy || null,
                yearsExperience,
                publicationCount,
                areasOfExpertise:
                    areasOfExpertise || null,
                professionalSkills:
                    professionalSkills || null,
                orcid: orcid || null,
                googleScholarUrl:
                    validatedGoogleScholarUrl,
                researchGateUrl:
                    validatedResearchGateUrl,
                linkedinUrl:
                    validatedLinkedinUrl,
                scopusId: scopusId || null,
                webOfScienceId:
                    webOfScienceId || null,
                cvUrl: validatedCvUrl,
                coverLetterUrl:
                    validatedCoverLetterUrl,
                certificatesUrl:
                    validatedCertificatesUrl,
                portfolioUrl:
                    validatedPortfolioUrl,
                professionalStatement,
                availability:
                    availability || null,
                salaryExpectation:
                    salaryExpectation || null,
                consentAccepted,
                declarationAccepted,
                status: "PENDING",
            },

            select: {
                id: true,
                fullName: true,
                email: true,
                position: true,
                submittedAt: true,
            },
        });

    if (existingUser) {
        await prisma.notification.create({
            data: {
                userId: existingUser.id,
                type: "GENERAL",
                title:
                    "Career Application Received",
                message:
                    `Your application for ${position
                        .replaceAll("_", " ")
                        .toLowerCase()} has been received.`,
                link: "/account",
            },
        });
    }

    const appUrl = getAppUrl();

    const emailContent =
        careerApplicationReceivedEmail({
            name: application.fullName,
            position: application.position,
            journalName: journal.name,
            careersUrl: `${appUrl}/careers`,
        });

    try {
        await sendEmail({
            to: application.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });
    } catch (error) {
        console.error(
            "Career application confirmation email failed:",
            {
                applicationId: application.id,
                recipient: application.email,
                error,
            },
        );
    }

    redirect(
        "/careers/apply?submitted=true",
    );
}
