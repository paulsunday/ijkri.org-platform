import "server-only";

const DEFAULT_TEST_ENDPOINT =
    "https://test.crossref.org/servlet/deposit";

export type CrossrefSubmissionResult = {
    accepted: boolean;
    statusCode: number;
    responseBody: string;
};

function getDepositEndpoint(): string {
    return (
        process.env.CROSSREF_DEPOSIT_ENDPOINT ||
        DEFAULT_TEST_ENDPOINT
    );
}

function getCredentials(): {
    loginId: string;
    password: string;
} {
    const loginId = process.env.CROSSREF_DEPOSITOR_LOGIN?.trim();
    const password =
        process.env.CROSSREF_DEPOSITOR_PASSWORD?.trim();

    if (!loginId || !password) {
        throw new Error(
            "Crossref depositor credentials are not configured. Set CROSSREF_DEPOSITOR_LOGIN and CROSSREF_DEPOSITOR_PASSWORD.",
        );
    }

    return {
        loginId,
        password,
    };
}

/**
 * Submits a Crossref deposit XML batch via the legacy `doMDUpload`
 * HTTPS POST interface.
 *
 * Defaults to Crossref's public test system
 * (test.crossref.org) unless CROSSREF_DEPOSIT_ENDPOINT points at
 * the production endpoint (https://doi.crossref.org/servlet/deposit).
 *
 * Crossref accepts deposits asynchronously: a 2xx response here
 * means the batch was accepted for processing, not that every DOI
 * in it has been confirmed registered. Final confirmation arrives
 * by email from Crossref, or can be checked via their submission
 * log API — this function only reports acceptance.
 */
export async function submitDepositToCrossref(
    depositXml: string,
): Promise<CrossrefSubmissionResult> {
    const { loginId, password } = getCredentials();

    const formData = new FormData();

    formData.set("operation", "doMDUpload");
    formData.set("login_id", loginId);
    formData.set("password", password);

    formData.set(
        "fname",
        new Blob([depositXml], {
            type: "application/xml",
        }),
        "deposit.xml",
    );

    const response = await fetch(getDepositEndpoint(), {
        method: "POST",
        body: formData,
    });

    const responseBody = await response.text();

    if (!response.ok) {
        throw new Error(
            `Crossref deposit request failed with status ${response.status}: ${responseBody.slice(0, 500)}`,
        );
    }

    return {
        accepted: true,
        statusCode: response.status,
        responseBody,
    };
}
