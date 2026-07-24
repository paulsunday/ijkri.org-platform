type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type LogEntry = {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
};

function sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) {
        return undefined;
    }

    const sensitiveKeys = new Set([
        "password",
        "currentPassword",
        "newPassword",
        "confirmPassword",
        "token",
        "accessToken",
        "refreshToken",
        "authorization",
        "cookie",
        "secret",
        "apiKey",
    ]);

    return Object.fromEntries(
        Object.entries(context).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [key, "[REDACTED]"];
            }

            if (value instanceof Error) {
                return [
                    key,
                    {
                        name: value.name,
                        message: value.message,
                        stack:
                            process.env.NODE_ENV === "development"
                                ? value.stack
                                : undefined,
                    },
                ];
            }

            return [key, value];
        }),
    );
}

function createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
): LogEntry {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        context: sanitizeContext(context),
    };
}

function writeLog(entry: LogEntry) {
    const output = JSON.stringify(entry);

    switch (entry.level) {
        case "debug":
            if (process.env.NODE_ENV === "development") {
                console.debug(output);
            }
            break;

        case "info":
            console.info(output);
            break;

        case "warn":
            console.warn(output);
            break;

        case "error":
            console.error(output);
            break;

        default:
            console.log(output);
    }
}

export const logger = {
    debug(message: string, context?: LogContext) {
        writeLog(createLogEntry("debug", message, context));
    },

    info(message: string, context?: LogContext) {
        writeLog(createLogEntry("info", message, context));
    },

    warn(message: string, context?: LogContext) {
        writeLog(createLogEntry("warn", message, context));
    },

    error(message: string, error?: unknown, context?: LogContext) {
        const errorContext: LogContext = {
            ...context,
        };

        if (error instanceof Error) {
            errorContext.error = {
                name: error.name,
                message: error.message,
                stack:
                    process.env.NODE_ENV === "development"
                        ? error.stack
                        : undefined,
            };
        } else if (error !== undefined) {
            errorContext.error = error;
        }

        writeLog(createLogEntry("error", message, errorContext));
    },
};

export function logServerActionError(
    action: string,
    error: unknown,
    context?: LogContext,
) {
    logger.error(`Server action failed: ${action}`, error, {
        action,
        ...context,
    });
}

export function logApiError(
    route: string,
    error: unknown,
    context?: LogContext,
) {
    logger.error(`API request failed: ${route}`, error, {
        route,
        ...context,
    });
}

export function logDatabaseError(
    operation: string,
    error: unknown,
    context?: LogContext,
) {
    logger.error(`Database operation failed: ${operation}`, error, {
        operation,
        ...context,
    });
}