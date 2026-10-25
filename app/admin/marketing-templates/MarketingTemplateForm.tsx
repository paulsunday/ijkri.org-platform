"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";
import type { MarketingAssetType } from "@/lib/generated/prisma";

import { uploadMarketingTemplate } from "./actions";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-2 text-sm ${
        state.success
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function MarketingTemplateForm({
  assetType,
  defaultCaption,
  hasCurrentTemplate,
}: {
  assetType: MarketingAssetType;
  defaultCaption: string;
  hasCurrentTemplate: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    uploadMarketingTemplate,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-4 space-y-3"
    >
      <input type="hidden" name="assetType" value={assetType} />

      <ActionBanner state={state} />

      <input
        type="file"
        name="background"
        accept="image/png,image/jpeg,image/webp"
        required
        disabled={pending}
        className="w-full rounded-lg border p-2 text-sm disabled:opacity-50"
      />

      <input
        type="text"
        name="defaultCaption"
        placeholder="Default share caption (use {code} and {link})"
        defaultValue={defaultCaption}
        disabled={pending}
        className="w-full rounded-lg border p-2 text-sm disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending
          ? "Uploading…"
          : hasCurrentTemplate
            ? "Replace Template"
            : "Upload Template"}
      </button>
    </form>
  );
}
