"use client";

import {
    useActionState,
    useEffect,
    useMemo,
    useState,
} from "react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
    createRefundAction,
    type PaymentActionState,
} from "./actions";

const INITIAL_STATE: PaymentActionState = {
    success: false,
    message: "",
};

type RefundDialogProps = {
    paymentId: string;
    currency: string;
    refundableAmount: number;
    disabled?: boolean;
};

function formatMoney(
    amount: number,
    currency: string,
) {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
    }).format(amount);
}

export function RefundDialog({
    paymentId,
    currency,
    refundableAmount,
    disabled = false,
}: RefundDialogProps) {
    const [open, setOpen] = useState(false);
    const [refundType, setRefundType] = useState<
        "FULL" | "PARTIAL"
    >("FULL");

    const [partialAmount, setPartialAmount] = useState("");

    const [state, formAction, pending] =
        useActionState(
            createRefundAction,
            INITIAL_STATE,
        );

    const maximumRefund = useMemo(
        () =>
            Math.max(
                0,
                Math.round(refundableAmount * 100) /
                100,
            ),
        [refundableAmount],
    );

    const amount =
        refundType === "FULL"
            ? maximumRefund.toFixed(2)
            : partialAmount;

    useEffect(() => {
        if (!state.success) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setOpen(false);
        }, 1200);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [state.success]);

    const numericAmount = Number(amount);

    const validClientAmount =
        Number.isFinite(numericAmount) &&
        numericAmount > 0 &&
        numericAmount <= maximumRefund;

    const noBalanceRemaining =
        maximumRefund <= 0;

    const actionDisabled =
        disabled ||
        noBalanceRemaining ||
        pending;

    function handleRefundTypeChange(
        type: "FULL" | "PARTIAL",
    ) {
        setRefundType(type);

        if (type === "PARTIAL") {
            setPartialAmount("");
        }
    }

    function handleOpenChange(
        nextOpen: boolean,
    ) {
        if (pending) {
            return;
        }

        setOpen(nextOpen);

        if (!nextOpen) {
            setRefundType("FULL");
            setPartialAmount("");
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={actionDisabled}
                    />
                }
            >
                {noBalanceRemaining
                    ? "Fully Refunded"
                    : "Issue Refund"}
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Issue payment refund
                    </DialogTitle>

                    <DialogDescription>
                        Refund all or part of this payment
                        through the original payment provider.
                        This financial action will be recorded
                        in the audit log.
                    </DialogDescription>
                </DialogHeader>

                <form
                    action={formAction}
                    className="space-y-6"
                >
                    <input
                        type="hidden"
                        name="paymentId"
                        value={paymentId}
                    />

                    <div className="rounded-lg border bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                            Refundable balance
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-slate-950">
                            {formatMoney(
                                maximumRefund,
                                currency,
                            )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Currency: {currency}
                        </p>
                    </div>

                    <Field>
                        <FieldLabel>
                            Refund type
                        </FieldLabel>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant={
                                    refundType === "FULL"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() =>
                                    handleRefundTypeChange(
                                        "FULL",
                                    )
                                }
                                disabled={pending}
                            >
                                Full refund
                            </Button>

                            <Button
                                type="button"
                                variant={
                                    refundType === "PARTIAL"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() =>
                                    handleRefundTypeChange(
                                        "PARTIAL",
                                    )
                                }
                                disabled={pending}
                            >
                                Partial refund
                            </Button>
                        </div>

                        <FieldDescription>
                            A full refund returns the complete
                            remaining balance. A partial refund
                            returns only the amount entered.
                        </FieldDescription>
                    </Field>

                    <Field
                        data-invalid={
                            Boolean(
                                state.fieldErrors?.amount,
                            ) || undefined
                        }
                    >
                        <FieldLabel htmlFor="refund-amount">
                            Refund amount
                        </FieldLabel>

                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                                {currency}
                            </span>

                            <Input
                                id="refund-amount"
                                name="amount"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                max={maximumRefund}
                                step="0.01"
                                value={amount}
                                onChange={(event) =>
                                    setPartialAmount(
                                        event.target.value,
                                    )
                                }
                                readOnly={
                                    refundType === "FULL"
                                }
                                disabled={pending}
                                aria-invalid={
                                    Boolean(
                                        state.fieldErrors
                                            ?.amount,
                                    )
                                }
                                className="pl-14"
                                required
                            />
                        </div>

                        <FieldDescription>
                            The amount cannot exceed{" "}
                            {formatMoney(
                                maximumRefund,
                                currency,
                            )}
                            .
                        </FieldDescription>

                        {state.fieldErrors?.amount && (
                            <FieldError>
                                {
                                    state.fieldErrors
                                        .amount
                                }
                            </FieldError>
                        )}
                    </Field>

                    <Field
                        data-invalid={
                            Boolean(
                                state.fieldErrors?.reason,
                            ) || undefined
                        }
                    >
                        <FieldLabel htmlFor="refund-reason">
                            Reason for refund
                        </FieldLabel>

                        <Textarea
                            id="refund-reason"
                            name="reason"
                            placeholder="Explain why this refund is being issued..."
                            minLength={10}
                            maxLength={500}
                            rows={5}
                            disabled={pending}
                            aria-invalid={
                                Boolean(
                                    state.fieldErrors?.reason,
                                )
                            }
                            required
                        />

                        <FieldDescription>
                            Enter between 10 and 500
                            characters. This explanation will
                            form part of the finance audit
                            record.
                        </FieldDescription>

                        {state.fieldErrors?.reason && (
                            <FieldError>
                                {
                                    state.fieldErrors
                                        .reason
                                }
                            </FieldError>
                        )}
                    </Field>

                    {state.message && (
                        <div
                            role={
                                state.success
                                    ? "status"
                                    : "alert"
                            }
                            className={`rounded-lg border p-4 text-sm ${state.success
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                                }`}
                        >
                            {state.message}
                        </div>
                    )}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Refunds may not be immediately
                        reversible after the payment provider
                        accepts the request. Confirm the
                        amount and reason carefully.
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                handleOpenChange(false)
                            }
                            disabled={pending}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                pending ||
                                !validClientAmount ||
                                noBalanceRemaining
                            }
                        >
                            {pending
                                ? "Processing refund..."
                                : `Refund ${formatMoney(
                                    validClientAmount
                                        ? numericAmount
                                        : 0,
                                    currency,
                                )}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}