import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { logger } from "@/lib/logger";

/*
 * Free-tier friendly defaults, tried in order. Override the first with
 * GEMINI_MODEL, or the whole list with GEMINI_FALLBACK_MODELS
 * (comma-separated), if Google renames models or you move to paid.
 */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.8-flash"];

function getModelChain(): string[] {
    const fallbacks = process.env.GEMINI_FALLBACK_MODELS
        ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim())
        : DEFAULT_FALLBACK_MODELS;

    return [
        ...new Set(
            [process.env.GEMINI_MODEL || DEFAULT_MODEL, ...fallbacks].filter(
                Boolean,
            ),
        ),
    ];
}

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
    let lastError: unknown;

    /*
     * Free-tier models are often briefly overloaded (503) or rate
     * limited (429). Retry once, then move on to the next model.
     */
    attempts: for (const model of getModelChain()) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        systemInstruction: system,
                        responseMimeType: "application/json",
                        responseJsonSchema: schema,
                        maxOutputTokens: 8000,
                    },
                });

                text = response.text;
                lastError = undefined;
                break attempts;
            } catch (error) {
                lastError = error;

                const status =
                    error instanceof ApiError ? error.status : undefined;

                logger.warn("Gemini attempt failed", {
                    event: "AI_ATTEMPT_FAILED",
                    feature,
                    model,
                    attempt,
                    status,
                });

                // Bad request / bad key: another try won't help.
                if (status === 400 || status === 401 || status === 403) {
                    break attempts;
                }

                // Retry the same model only for temporary overloads.
                if (status !== 503 && status !== 500) {
                    break;
                }

                if (attempt === 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }
            }
        }
    }

    if (lastError) {
        logger.error("Gemini request failed", lastError, {
            event: "AI_REQUEST_FAILED",
            feature,
            status:
                lastError instanceof ApiError ? lastError.status : undefined,
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
