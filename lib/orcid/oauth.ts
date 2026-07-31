import "server-only";

export const ORCID_STATE_COOKIE = "orcid_oauth_state";

function getApplicationUrl(): string {
    const applicationUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        process.env.NEXTAUTH_URL;

    if (!applicationUrl) {
        throw new Error(
            "Application URL is not configured. Add NEXT_PUBLIC_APP_URL to your environment variables.",
        );
    }

    return applicationUrl.replace(/\/$/, "");
}

function getRedirectUri(): string {
    return `${getApplicationUrl()}/api/auth/orcid/callback`;
}

function getOrcidApiBase(): string {
    return (
        process.env.ORCID_API_BASE?.replace(/\/$/, "") ||
        "https://orcid.org"
    );
}

function getOrcidCredentials(): {
    clientId: string;
    clientSecret: string;
} {
    const clientId = process.env.ORCID_CLIENT_ID?.trim();
    const clientSecret =
        process.env.ORCID_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
        throw new Error(
            "ORCID OAuth credentials are not configured. Set ORCID_CLIENT_ID and ORCID_CLIENT_SECRET.",
        );
    }

    return {
        clientId,
        clientSecret,
    };
}

/**
 * Builds the ORCID authorization URL for the lightweight
 * `/authenticate` scope, which only asks ORCID to confirm the
 * user's identity (no profile read access is requested).
 */
export function buildOrcidAuthorizeUrl(state: string): string {
    const { clientId } = getOrcidCredentials();

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        scope: "/authenticate",
        redirect_uri: getRedirectUri(),
        state,
    });

    return `${getOrcidApiBase()}/oauth/authorize?${params.toString()}`;
}

export type OrcidTokenResult = {
    orcid: string;
    name: string | null;
};

type OrcidTokenResponse = {
    orcid?: string;
    name?: string;
    error?: string;
    error_description?: string;
};

/**
 * Exchanges an authorization code for the ORCID iD it belongs to.
 * The `/authenticate` scope's token response includes the ORCID
 * iD directly, so no separate profile request is required.
 */
export async function exchangeOrcidCode(
    code: string,
): Promise<OrcidTokenResult> {
    const { clientId, clientSecret } =
        getOrcidCredentials();

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(),
    });

    const response = await fetch(
        `${getOrcidApiBase()}/oauth/token`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: body.toString(),
        },
    );

    const payload = (await response
        .json()
        .catch(() => null)) as OrcidTokenResponse | null;

    if (!response.ok || !payload?.orcid) {
        throw new Error(
            payload?.error_description ||
                payload?.error ||
                `ORCID token exchange failed with status ${response.status}.`,
        );
    }

    return {
        orcid: payload.orcid,
        name: payload.name ?? null,
    };
}
