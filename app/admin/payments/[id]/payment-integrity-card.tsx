import { PaymentStatus } from "@/lib/generated/prisma";

type PaymentIntegrityCardProps = {
    paymentStatus: PaymentStatus;
    purpose: string;
    webhookCount: number;
    refundCount: number;
    outstanding: number;
};

export function PaymentIntegrityCard({
    paymentStatus,
    purpose,
    webhookCount,
    refundCount,
    outstanding,
}: PaymentIntegrityCardProps) {
    const isVerified =
        paymentStatus === PaymentStatus.PAID ||
        paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
        paymentStatus === PaymentStatus.REFUNDED;

    return (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Payment Integrity Checks
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Internal validation summary for this
                    payment.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Payment Status
                    </p>

                    <p className="mt-2 font-semibold">
                        {paymentStatus}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Purpose
                    </p>

                    <p className="mt-2 font-semibold">
                        {purpose.replaceAll("_", " ")}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Webhooks Received
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {webhookCount}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Refund Count
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {refundCount}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Verified Payment
                    </p>

                    <p className="mt-2 font-semibold">
                        {isVerified ? "Yes" : "No"}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-slate-500">
                        Fully Refunded
                    </p>

                    <p className="mt-2 font-semibold">
                        {outstanding === 0
                            ? "Yes"
                            : "No"}
                    </p>
                </div>

            </div>
        </section>
    );
}