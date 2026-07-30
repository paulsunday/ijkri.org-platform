"use client";

import {
    useState,
    useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import {
    cancelPaymentAction,
    reconcilePaymentAction,
} from "./actions";

type PaymentStatusValue =
    | "PENDING"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";

type PaymentActionsProps = {
    paymentId: string;
    status: PaymentStatusValue;
    provider: string;
    providerReference?: string | null;
};

type ActionFeedback = {
    type: "success" | "error";
    message: string;
} | null;

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "An unexpected error occurred. Please try again.";
}

export function PaymentActions({
    paymentId,
    status,
    provider,
    providerReference,
}: PaymentActionsProps) {
    const router = useRouter();

    const [cancelDialogOpen, setCancelDialogOpen] =
        useState(false);

    const [cancellationReason, setCancellationReason] =
        useState("");

    const [reconcileFeedback, setReconcileFeedback] =
        useState<ActionFeedback>(null);

    const [cancelFeedback, setCancelFeedback] =
        useState<ActionFeedback>(null);

    const [
        reconciliationPending,
        startReconciliation,
    ] = useTransition();

    const [
        cancellationPending,
        startCancellation,
    ] = useTransition();

    const canCancel =
        status === "PENDING" ||
        status === "PROCESSING";

    const canReconcile =
        provider === "PAYSTACK" &&
        status !== "REFUNDED" &&
        status !== "CANCELLED";

    const trimmedReason =
        cancellationReason.trim();

    const reasonTooShort =
        trimmedReason.length > 0 &&
        trimmedReason.length < 10;

    const reasonTooLong =
        trimmedReason.length > 500;

    const reasonValid =
        trimmedReason.length >= 10 &&
        trimmedReason.length <= 500;

    function handleReconcile() {
        setReconcileFeedback(null);

        startReconciliation(async () => {
            try {
                const formData = new FormData();

                formData.set(
                    "paymentId",
                    paymentId,
                );

                await reconcilePaymentAction(
                    formData,
                );

                setReconcileFeedback({
                    type: "success",
                    message:
                        "Payment reconciliation completed successfully.",
                });

                router.refresh();
            } catch (error) {
                setReconcileFeedback({
                    type: "error",
                    message:
                        getErrorMessage(error),
                });
            }
        });
    }

    function handleCancelPayment() {
        if (!reasonValid) {
            setCancelFeedback({
                type: "error",
                message:
                    "Enter a cancellation reason between 10 and 500 characters.",
            });

            return;
        }

        setCancelFeedback(null);

        startCancellation(async () => {
            try {
                const formData = new FormData();

                formData.set(
                    "paymentId",
                    paymentId,
                );

                formData.set(
                    "reason",
                    trimmedReason,
                );

                await cancelPaymentAction(
                    formData,
                );

                setCancelFeedback({
                    type: "success",
                    message:
                        "The payment was cancelled successfully.",
                });

                router.refresh();

                window.setTimeout(() => {
                    setCancelDialogOpen(false);
                    setCancellationReason("");
                    setCancelFeedback(null);
                }, 1000);
            } catch (error) {
                setCancelFeedback({
                    type: "error",
                    message:
                        getErrorMessage(error),
                });
            }
        });
    }

    function handleCancelDialogChange(
        nextOpen: boolean,
    ) {
        if (cancellationPending) {
            return;
        }

        setCancelDialogOpen(nextOpen);

        if (!nextOpen) {
            setCancellationReason("");
            setCancelFeedback(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                    Provider reconciliation
                </p>

                <p className="mt-1 text-sm text-slate-600">
                    Verify the transaction directly
                    with the payment provider and
                    update the local payment record.
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                            Provider
                        </dt>

                        <dd className="font-medium">
                            {provider}
                        </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                            Reference
                        </dt>

                        <dd className="max-w-[65%] break-all text-right font-mono text-xs">
                            {providerReference ??
                                "Internal reference will be used"}
                        </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                            Current status
                        </dt>

                        <dd className="font-medium">
                            {status.replaceAll(
                                "_",
                                " ",
                            )}
                        </dd>
                    </div>
                </dl>
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={
                    !canReconcile ||
                    reconciliationPending
                }
                onClick={handleReconcile}
            >
                {reconciliationPending
                    ? "Reconciling payment..."
                    : "Reconcile with Paystack"}
            </Button>

            {!canReconcile && (
                <p className="text-xs text-slate-500">
                    Reconciliation is unavailable
                    for this provider or payment
                    status.
                </p>
            )}

            {reconcileFeedback && (
                <div
                    role={
                        reconcileFeedback.type ===
                            "success"
                            ? "status"
                            : "alert"
                    }
                    className={`rounded-lg border p-3 text-sm ${reconcileFeedback.type ===
                        "success"
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-red-200 bg-red-50 text-red-800"
                        }`}
                >
                    {reconcileFeedback.message}
                </div>
            )}

            <Dialog
                open={cancelDialogOpen}
                onOpenChange={
                    handleCancelDialogChange
                }
            >
                <DialogTrigger
                    render={
                        <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            disabled={
                                !canCancel ||
                                cancellationPending
                            }
                        />
                    }
                >
                    Cancel payment
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Cancel payment
                        </DialogTitle>

                        <DialogDescription>
                            This action will mark the
                            payment as cancelled,
                            record the reason in the
                            finance audit trail, and
                            notify the customer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Only pending or processing
                            payments can be cancelled.
                            A completed payment must be
                            handled through the refund
                            process instead.
                        </div>

                        <Field
                            data-invalid={
                                reasonTooShort ||
                                reasonTooLong ||
                                Boolean(
                                    cancelFeedback?.type ===
                                    "error",
                                ) ||
                                undefined
                            }
                        >
                            <FieldLabel htmlFor="payment-cancellation-reason">
                                Cancellation reason
                            </FieldLabel>

                            <Textarea
                                id="payment-cancellation-reason"
                                value={
                                    cancellationReason
                                }
                                onChange={(event) => {
                                    setCancellationReason(
                                        event.target
                                            .value,
                                    );

                                    if (
                                        cancelFeedback
                                    ) {
                                        setCancelFeedback(
                                            null,
                                        );
                                    }
                                }}
                                placeholder="Explain clearly why this payment is being cancelled..."
                                minLength={10}
                                maxLength={500}
                                rows={5}
                                disabled={
                                    cancellationPending
                                }
                                aria-invalid={
                                    reasonTooShort ||
                                    reasonTooLong
                                }
                            />

                            <FieldDescription>
                                Enter between 10 and 500
                                characters. The customer
                                will receive this reason
                                in the cancellation
                                notification.
                            </FieldDescription>

                            {reasonTooShort && (
                                <FieldError>
                                    The cancellation
                                    reason must contain
                                    at least 10
                                    characters.
                                </FieldError>
                            )}

                            {reasonTooLong && (
                                <FieldError>
                                    The cancellation
                                    reason cannot exceed
                                    500 characters.
                                </FieldError>
                            )}
                        </Field>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>
                                Required: 10–500
                                characters
                            </span>

                            <span>
                                {
                                    cancellationReason
                                        .length
                                }
                                /500
                            </span>
                        </div>

                        {cancelFeedback && (
                            <div
                                role={
                                    cancelFeedback.type ===
                                        "success"
                                        ? "status"
                                        : "alert"
                                }
                                className={`rounded-lg border p-3 text-sm ${cancelFeedback.type ===
                                    "success"
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : "border-red-200 bg-red-50 text-red-800"
                                    }`}
                            >
                                {
                                    cancelFeedback.message
                                }
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    cancellationPending
                                }
                                onClick={() =>
                                    setCancelDialogOpen(
                                        false,
                                    )
                                }
                            >
                                Keep payment
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                disabled={
                                    cancellationPending ||
                                    !reasonValid
                                }
                                onClick={
                                    handleCancelPayment
                                }
                            >
                                {cancellationPending
                                    ? "Cancelling payment..."
                                    : "Confirm cancellation"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {!canCancel && (
                <p className="text-xs text-slate-500">
                    This payment can no longer be
                    cancelled because its current
                    status is{" "}
                    {status
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    .
                </p>
            )}
        </div>
    );
}