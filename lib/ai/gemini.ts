import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { logger } from "@/lib/logger";

/*
 * Free-tier friendly default. Override with GEMINI_MODEL if Google
 * renames models or you move to a paid tier.
 */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Message shown to users when the AI service can't be reached. */
export const AI_UNAVAILABLE_MESSAGE =
    "The AI assistant is busy or temporarily unavailable. Please try again in a few minutes.";

/**
 * Thrown for failures the user should see as "try again later" (quota
 * reached, missing key, provider outage). The real cause is logged.
 */
export class AiUnavailableError extends Error {
    constructor() {
        super(AI_UNAVAILABLE_MESSAGE);
        this.name = "AiUnavailableError";
    }
}

/**
 * Asks Gemini for JSON that matches `schema` and returns it parsed.
 */
export async function generateStructuredJson<T>({
    system,
    prompt,
    schema,
    feature,
}: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
    feature: string;
}): Promise<T> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        logger.error("GEMINI_API_KEY is not configured", undefined, {
            event: "AI_NOT_CONFIGURED",
            feature,
        });

        throw new AiUnavailableError();
    }

    const ai = new GoogleGenAI({ apiKey });

    let text: string | undefined;

    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
            contents: prompt,
            config: {
                systemInstruction: system,
                responseMimeType: "application/json",
                responseJsonSchema: schema,
                maxOutputTokens: 8000,
            },
        });

        text = response.text;
    } catch (error) {
        logger.error("Gemini request failed", error, {
            event: "AI_REQUEST_FAILED",
            feature,
            status: error instanceof ApiError ? error.status : undefined,
        });

        throw new AiUnavailableError();
    }

    if (!text) {
        // Usually a safety block or an empty candidate.
        throw new Error(
            "The AI could not process this request. Please rephrase it and try again.",
        );
    }

    try {
        return JSON.parse(text) as T;
    } catch (error) {
        logger.error("Gemini returned invalid JSON", error, {
            event: "AI_INVALID_JSON",
            feature,
        });

        throw new AiUnavailableError();
    }
}
