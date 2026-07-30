import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
    ORCID_STATE_COOKIE,
    exchangeOrcidCode,
} from "@/lib/orcid/oauth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function redirectToAccount(
    request: NextRequest,
    params: Record<string, string>,
) {
    const url = new URL("/account", request.url);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    const response = NextResponse.redirect(url);

    response.cookies.delete(ORCID_STATE_COOKIE);

    return response;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");

    const expectedState = request.cookies.get(
        ORCID_STATE_COOKIE,
    )?.value;

    if (oauthError) {
        return redirectToAccount(request, {
            orcidError:
                "ORCID authorization was cancelled or denied.",
        });
    }

    if (
        !code ||
        !state ||
        !expectedState ||
        state !== expectedState
    ) {
        return redirectToAccount(request, {
            orcidError:
                "The ORCID authorization request could not be verified. Please try again.",
        });
    }

    const user = await getCurrentUser();

    if (!user) {
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(ORCID_STATE_COOKIE);
        return response;
    }

    try {
        const { orcid } = await exchangeOrcidCode(code);

        const existingOwner =
            await prisma.user.findFirst({
                where: {
                    orcid,
                    orcidVerifiedAt: {
                        not: null,
                    },
                    id: {
                        not: user.id,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (existingOwner) {
            return redirectToAccount(request, {
                orcidError:
                    "This ORCID iD is already verified on a different account.",
            });
        }

        const verifiedAt = new Date();

        await prisma.$transaction([
            prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    orcid,
                    orcidVerifiedAt: verifiedAt,
                },
            }),

            prisma.activityLog.create({
                data: {
                    userId: user.id,
                    action: "UPDATE",
                    entity: "User",
                    entityId: user.id,
                    metadata: {
                        event: "ORCID_CONNECTED",
                        orcid,
                    },
                },
            }),
        ]);

        return redirectToAccount(request, {
            orcidConnected: "1",
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "ORCID connection failed.";

        return redirectToAccount(request, {
            orcidError: message,
        });
    }
}
