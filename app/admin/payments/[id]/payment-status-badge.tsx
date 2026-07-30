import { Badge } from "@/components/ui/badge";
import { PaymentStatus } from "@/lib/generated/prisma";

type PaymentStatusBadgeProps = {
    status: PaymentStatus;
    className?: string;
};

const STATUS_CONFIG: Record<
    PaymentStatus,
    {
        label: string;
        className: string;
    }
> = {
    PENDING: {
        label: "Pending",
        className:
            "border-amber-200 bg-amber-50 text-amber-800",
    },

    PROCESSING: {
        label: "Processing",
        className:
            "border-blue-200 bg-blue-50 text-blue-800",
    },

    PAID: {
        label: "Paid",
        className:
            "border-emerald-200 bg-emerald-50 text-emerald-800",
    },

    FAILED: {
        label: "Failed",
        className:
            "border-red-200 bg-red-50 text-red-800",
    },

    CANCELLED: {
        label: "Cancelled",
        className:
            "border-slate-300 bg-slate-100 text-slate-700",
    },

    REFUNDED: {
        label: "Refunded",
        className:
            "border-purple-200 bg-purple-50 text-purple-800",
    },

    PARTIALLY_REFUNDED: {
        label: "Partially Refunded",
        className:
            "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
};

export function PaymentStatusBadge({
    status,
    className = "",
}: PaymentStatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    return (
        <Badge
            variant="outline"
            className={[
                "whitespace-nowrap font-medium",
                config.className,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {config.label}
        </Badge>
    );
}