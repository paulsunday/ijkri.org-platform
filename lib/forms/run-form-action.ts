import { logger } from "@/lib/logger";

export type FormActionState = {
  success: boolean;
  message: string;
};

export const IDLE_FORM_ACTION_STATE: FormActionState = {
  success: false,
  message: "",
};

/**
 * Runs a server action body, converting any thrown Error into a returned
 * {success:false, message} instead of letting it propagate to the nearest
 * error boundary. Forms bound directly to a throwing action via
 * `<form action={fn}>` have no inline error handling, so an ordinary
 * validation failure (duplicate value, wrong state, missing field, ...)
 * would otherwise crash the whole page instead of showing what was wrong.
 */
export async function runFormAction(
  fn: () => Promise<string>,
  context?: Record<string, unknown>,
): Promise<FormActionState> {
  try {
    const message = await fn();

    return { success: true, message };
  } catch (error) {
    logger.error("Form action failed", error, {
      event: "FORM_ACTION_FAILED",
      ...context,
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}
