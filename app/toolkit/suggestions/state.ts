import type { SuggestedTopic } from "@/lib/ai/suggest-topics";

// Kept out of actions.ts: a "use server" file may only export async functions.
export type SuggestTopicsState = {
    success: boolean;
    message: string;
    suggestions: SuggestedTopic[];
};

export const IDLE_SUGGEST_TOPICS_STATE: SuggestTopicsState = {
    success: false,
    message: "",
    suggestions: [],
};
