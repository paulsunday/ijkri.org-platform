type FinanceAuditCardProps = {
    createdAt: Date;
    updatedAt: Date;
    paymentId: string;
    journalId: string;
    userId: string;
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export function FinanceAuditCard({
    createdAt,
    updatedAt,
    paymentId,
    journalId,
    userId,
}: FinanceAuditCardProps) {
    return (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Finance Audit
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Internal identifiers and audit timestamps
                    for this payment record.
                </p>
            </div>

            <dl className="space-y-5">
                <div>
                    <dt className="text-sm text-slate-500">
                        Created
                    </dt>

                    <dd className="mt-1">
                        {formatDate(createdAt)}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Updated
                    </dt>

                    <dd className="mt-1">
                        {formatDate(updatedAt)}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Payment ID
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm">
                        {paymentId}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        Journal ID
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm">
                        {journalId}
                    </dd>
                </div>

                <div>
                    <dt className="text-sm text-slate-500">
                        User ID
                    </dt>

                    <dd className="mt-1 break-all font-mono text-sm">
                        {userId}
                    </dd>
                </div>
            </dl>
        </section>
    );
}