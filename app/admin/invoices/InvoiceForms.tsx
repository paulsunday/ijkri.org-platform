"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  recordManualPayment,
  waiveInvoice,
  type InvoiceActionState,
} from "./actions";

const IDLE_STATE: InvoiceActionState = { success: false, message: "" };

function ActionBanner({ state }: { state: InvoiceActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-2.5 text-sm ${
        state.success
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function RecordManualPaymentForm({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    recordManualPayment,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl bg-green-50 p-5"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />

      <h4 className="font-semibold text-green-900">
        Record Manual Payment
      </h4>

      <ActionBanner state={state} />

      <input
        name="paymentMethod"
        required
        disabled={pending}
        placeholder="Payment method (e.g. bank transfer)"
        className="w-full rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50"
      />

      <input
        name="paymentReference"
        disabled={pending}
        placeholder="Reference (optional)"
        className="w-full rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50"
      />

      <textarea
        name="notes"
        rows={2}
        disabled={pending}
        placeholder="Notes (optional)"
        className="w-full rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Recording…" : "Mark as Paid"}
      </button>
    </form>
  );
}

export function WaiveInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    waiveInvoice,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl bg-amber-50 p-5"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />

      <h4 className="font-semibold text-amber-900">Waive APC</h4>

      <ActionBanner state={state} />

      <textarea
        name="waiverReason"
        required
        rows={3}
        disabled={pending}
        placeholder="Reason for waiving this invoice (required)"
        className="w-full rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {pending ? "Waiving…" : "Waive Invoice"}
      </button>
    </form>
  );
}
