import { RefundStatus } from "@/lib/generated/prisma";

type Refund = {
    id: string;
    amount: {
        toNumber(): number;
    };
    currency: string;
    createdAt: Date;
    status: RefundStatus;
    reason: string | null;
    providerReference: string | null;
};

type RefundHistoryCardProps = {
    refunds: Refund[];
};

function money(
    value: number,
    currency: string,
) {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
    }).format(value);
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function statusClasses(
    status: RefundStatus,
) {
    switch (status) {
        case RefundStatus.SUCCESSFUL:
            return "bg-green-100 text-green-700";

        case RefundStatus.PROCESSING:
            return "bg-blue-100 text-blue-700";

        case RefundStatus.FAILED:
            return "bg-red-100 text-red-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

export function RefundHistoryCard({
    refunds,
}: RefundHistoryCardProps) {
    return (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Refund History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    All refunds associated with
                    this payment.
                </p>
            </div>

            {refunds.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
                    No refunds have been recorded.
                </div>
            ) : (
                <div className="space-y-5">
                    {refunds.map((refund) => (
                        <div
                            key={refund.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">
                                        {money(
                                            refund.amount.toNumber(),
                                            refund.currency,
                                        )}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {formatDate(
                                            refund.createdAt,
                                        )}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(
                                        refund.status,
                                    )}`}
                                >
                                    {refund.status.replaceAll(
                                        "_",
                                        " ",
                                    )}
                                </span>
                            </div>

                            {refund.reason && (
                                <div className="mt-4">
                                    <p className="text-sm text-slate-500">
                                        Reason
                                    </p>

                                    <p className="mt-1">
                                        {refund.reason}
                                    </p>
                                </div>
                            )}

                            {refund.providerReference && (
                                <div className="mt-4">
                                    <p className="text-sm text-slate-500">
                                        Provider Reference
                                    </p>

                                    <p className="mt-1 break-all font-mono text-sm">
                                        {
                                            refund.providerReference
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}