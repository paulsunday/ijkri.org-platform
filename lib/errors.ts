export type AppErrorCode =
    | "VALIDATION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "AUTHORIZATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMIT_ERROR"
    | "DATABASE_ERROR"
    | "FILE_UPLOAD_ERROR"
    | "EXTERNAL_SERVICE_ERROR"
    | "INTERNAL_SERVER_ERROR";

type AppErrorOptions = {
    code?: AppErrorCode;
    statusCode?: number;
    cause?: unknown;
    details?: Record<string, unknown>;
};

export class AppError extends Error {
    readonly code: AppErrorCode;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;

    constructor(message: string, options: AppErrorOptions = {}) {
        super(message, {
            cause: options.cause,
        });

        this.name = "AppError";
        this.code = options.code ?? "INTERNAL_SERVER_ERROR";
        this.statusCode = options.statusCode ?? 500;
        this.details = options.details;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(
        message = "The submitted information is invalid.",
        details?: Record<string, unknown>,
    ) {
        super(message, {
            code: "VALIDATION_ERROR",
            statusCode: 400,
            details,
        });

        this.name = "ValidationError";
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "You must sign in to continue.") {
        super(message, {
            code: "AUTHENTICATION_ERROR",
            statusCode: 401,
        });

        this.name = "AuthenticationError";
    }
}

export class AuthorizationError extends AppError {
    constructor(
        message = "You do not have permission to perform this action.",
    ) {
        super(message, {
            code: "AUTHORIZATION_ERROR",
            statusCode: 403,
        });

        this.name = "AuthorizationError";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "The requested resource was not found.") {
        super(message, {
            code: "NOT_FOUND",
            statusCode: 404,
        });

        this.name = "NotFoundError";
    }
}

export class ConflictError extends AppError {
    constructor(message = "The requested action conflicts with existing data.") {
        super(message, {
            code: "CONFLICT",
            statusCode: 409,
        });

        this.name = "ConflictError";
    }
}

export class RateLimitError extends AppError {
    constructor(
        message = "Too many requests. Please wait and try again.",
    ) {
        super(message, {
            code: "RATE_LIMIT_ERROR",
            statusCode: 429,
        });

        this.name = "RateLimitError";
    }
}

export class DatabaseError extends AppError {
    constructor(
        message = "A database operation could not be completed.",
        cause?: unknown,
    ) {
        super(message, {
            code: "DATABASE_ERROR",
            statusCode: 500,
            cause,
        });

        this.name = "DatabaseError";
    }
}

export class FileUploadError extends AppError {
    constructor(
        message = "The file could not be uploaded.",
        details?: Record<string, unknown>,
    ) {
        super(message, {
            code: "FILE_UPLOAD_ERROR",
            statusCode: 400,
            details,
        });

        this.name = "FileUploadError";
    }
}

export class ExternalServiceError extends AppError {
    constructor(
        message = "An external service could not complete the request.",
        cause?: unknown,
    ) {
        super(message, {
            code: "EXTERNAL_SERVICE_ERROR",
            statusCode: 502,
            cause,
        });

        this.name = "ExternalServiceError";
    }
}

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

export function getErrorMessage(
    error: unknown,
    fallback = "An unexpected error occurred.",
) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return fallback;
}

export function toAppError(
    error: unknown,
    fallbackMessage = "An unexpected error occurred.",
) {
    if (isAppError(error)) {
        return error;
    }

    return new AppError(fallbackMessage, {
        code: "INTERNAL_SERVER_ERROR",
        statusCode: 500,
        cause: error,
    });
}

export type PublicError = {
    code: AppErrorCode;
    message: string;
};

export function toPublicError(error: unknown): PublicError {
    const appError = toAppError(error);

    if (process.env.NODE_ENV === "production") {
        if (appError.statusCode >= 500) {
            return {
                code: "INTERNAL_SERVER_ERROR",
                message:
                    "The request could not be completed due to an internal error.",
            };
        }
    }

    return {
        code: appError.code,
        message: appError.message,
    };
}

export function getErrorStatusCode(error: unknown) {
    return isAppError(error) ? error.statusCode : 500;
}