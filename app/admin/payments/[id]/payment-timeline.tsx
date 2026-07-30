type RefundTimelineEvent = {
    createdAt: Date;
    status: string;
};

type PaymentTimelineProps = {
    createdAt: Date;
    initiatedAt?: Date | null;
    paidAt?: Date | null;
    latestRefund?: RefundTimelineEvent | null;
};

function formatDate(
    value: Date | null | undefined,
) {
    if (!value) {
        return "Not yet completed";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

function formatStatus(status: string) {
    return status.replaceAll("_", " ");
}

export function PaymentTimeline({
    createdAt,
    initiatedAt,
    paidAt,
    latestRefund,
}: PaymentTimelineProps) {
    return (
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Payment Timeline
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Chronological record of the payment
                    lifecycle.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex gap-4">
                    <div
                        className="mt-2 h-3 w-3 shrink-0 rounded-full bg-slate-500"
                        aria-hidden="true"
                    />

                    <div>
                        <h3 className="font-medium">
                            Payment Created
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            {formatDate(createdAt)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div
                        className={`mt-2 h-3 w-3 shrink-0 rounded-full ${initiatedAt
                            ? "bg-blue-600"
                            : "bg-slate-300"
                            }`}
                        aria-hidden="true"
                    />

                    <div>
                        <h3 className="font-medium">
                            Payment Initiated
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            {formatDate(initiatedAt)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div
                        className={`mt-2 h-3 w-3 shrink-0 rounded-full ${paidAt
                            ? "bg-green-600"
                            : "bg-slate-300"
                            }`}
                        aria-hidden="true"
                    />

                    <div>
                        <h3 className="font-medium">
                            Payment Completed
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            {formatDate(paidAt)}
                        </p>
                    </div>
                </div>

                {latestRefund && (
                    <div className="flex gap-4">
                        <div
                            className="mt-2 h-3 w-3 shrink-0 rounded-full bg-purple-600"
                            aria-hidden="true"
                        />

                        <div>
                            <h3 className="font-medium">
                                Refund{" "}
                                {formatStatus(
                                    latestRefund.status,
                                )}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                {formatDate(
                                    latestRefund.createdAt,
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}