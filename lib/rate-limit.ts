import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { RateLimitError } from "@/lib/errors";

type RateLimitName =
  | "login"
  | "registration"
  | "forgot-password"
  | "reset-password"
  | "submission"
  | "revision"
  | "review"
  | "reviewer-application"
  | "career-application"
  | "account-activation"
  | "referral-redeem"
  | "withdrawal-request"
  | "certificate-download"
  | "bank-resolve"
  | "general-api";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const redisConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = redisConfigured ? Redis.fromEnv() : null;

function createLimiter(
  requests: number,
  duration: Parameters<typeof Ratelimit.slidingWindow>[1],
  prefix: string,
) {
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, duration),
    analytics: true,
    prefix: `journal-platform:${prefix}`,
    timeout: 1_500,
  });
}

const limiters: Record<RateLimitName, Ratelimit | null> = {
  login: createLimiter(10, "15 m", "login"),

  registration: createLimiter(3, "1 h", "registration"),

  "forgot-password": createLimiter(3, "1 h", "forgot-password"),

  "reset-password": createLimiter(5, "1 h", "reset-password"),

  "account-activation": createLimiter(5, "1 h", "account-activation"),

  submission: createLimiter(10, "1 h", "submission"),

  revision: createLimiter(20, "1 h", "revision"),

  review: createLimiter(30, "1 h", "review"),

  "reviewer-application": createLimiter(5, "1 d", "reviewer-application"),

  "career-application": createLimiter(5, "1 d", "career-application"),

  "referral-redeem": createLimiter(20, "1 h", "referral-redeem"),

  "withdrawal-request": createLimiter(5, "1 d", "withdrawal-request"),

  "certificate-download": createLimiter(30, "1 h", "certificate-download"),

  "bank-resolve": createLimiter(10, "1 h", "bank-resolve"),

  "general-api": createLimiter(100, "1 m", "general-api"),
};

export async function checkRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[name];

  /*
   * Local development may continue without Redis credentials.
   * Production must always have Redis configured.
   */
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Rate limiting is unavailable because Upstash Redis is not configured.",
      );
    }

    return {
      success: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Date.now(),
    };
  }

  return limiter.limit(identifier);
}

export async function enforceRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const result = await checkRateLimit(name, identifier);

  if (!result.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );

    const error = new RateLimitError(
      `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
    );

    (
      error as RateLimitError & {
        retryAfter?: number;
      }
    ).retryAfter = retryAfterSeconds;

    throw error;
  }

  return result;
}
