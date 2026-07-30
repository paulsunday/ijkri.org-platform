type ProviderResponseCardProps = {
    provider: string;
    providerStatus?: string | null;
    providerReference?: string | null;
    providerChannel?: string | null;
    providerResponse?: unknown;
};

function formatValue(
    value: string | null | undefined,
) {
    const normalisedValue = value?.trim();

    return normalisedValue || "—";
}

function formatJson(value: unknown) {
    if (value === null || value === undefined) {
        return null;
    }

    try {
        return JSON.stringify(
            value,
            null,
            2,
        );
    } catch {
        return String(value);
    }
}

export function ProviderResponseCard({
    provider,
    providerStatus,
    providerReference,
    providerChannel,
    providerResponse,
}: ProviderResponseCardProps) {
    const formattedResponse =
        formatJson(providerResponse);

    return (
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Provider Response
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Transaction information returned
                    by the payment gateway.
                </p>
            </div>

            <dl className="grid gap-6 md:grid-cols-2">
                <div>
                    <dt className="text-sm text-slate-500">
                        Gateway
                    </dt>

                    <dd className="mt-1 font-medium">
                        {formatValue(provider)}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Provider Status
                    </dt>

                    <dd className="mt-1 font-medium">
                        {formatValue(
                            providerStatus,
                        )}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Transaction Reference
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm">
                        {formatValue(
                            providerReference,
                        )}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Channel
                    </dt>

                    <dd className="mt-1 font-medium">
                        {formatValue(
                            providerChannel,
                        )}
                    </dd>
                </div>
            </dl>

            {formattedResponse ? (
                <details className="mt-8 overflow-hidden rounded-lg border">
                    <summary className="cursor-pointer select-none bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
                        View raw provider response
                    </summary>

                    <div className="border-t bg-slate-950 p-4">
                        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-emerald-300">
                            {formattedResponse}
                        </pre>
                    </div>
                </details>
            ) : (
                <div className="mt-8 rounded-lg border border-dashed p-4 text-sm text-slate-500">
                    No raw provider response has been
                    stored for this payment.
                </div>
            )}
        </section>
    );
}