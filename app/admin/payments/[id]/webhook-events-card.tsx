type WebhookLog = {
    id: string;
    eventType: string;
    receivedAt: Date | null;
    signatureValid: boolean;
};

type WebhookEventsCardProps = {
    logs: WebhookLog[];
};

function formatDate(value: Date | null) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export function WebhookEventsCard({
    logs,
}: WebhookEventsCardProps) {
    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold">
                Webhook Events
            </h2>

            {logs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
                    No webhook events have been received.
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-medium">
                                        {log.eventType}
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {formatDate(
                                            log.receivedAt,
                                        )}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-sm font-medium ${log.signatureValid
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                        }`}
                                >
                                    {log.signatureValid
                                        ? "Verified"
                                        : "Invalid"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}