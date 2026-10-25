"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { IDLE_FORM_ACTION_STATE } from "@/lib/forms/run-form-action";

import {
  activateCampaign,
  pauseCampaign,
  resumeCampaign,
  archiveCampaign,
  duplicateCampaign,
  deleteCampaign,
} from "./actions";

type CampaignForActions = {
  id: string;
  status: string;
};

export function CampaignActionButtons({
  campaign,
}: {
  campaign: CampaignForActions;
}) {
  const router = useRouter();

  const [activateState, activateAction, activatePending] = useActionState(
    activateCampaign,
    IDLE_FORM_ACTION_STATE,
  );
  const [pauseState, pauseAction, pausePending] = useActionState(
    pauseCampaign,
    IDLE_FORM_ACTION_STATE,
  );
  const [resumeState, resumeAction, resumePending] = useActionState(
    resumeCampaign,
    IDLE_FORM_ACTION_STATE,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCampaign,
    IDLE_FORM_ACTION_STATE,
  );
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(
    duplicateCampaign,
    IDLE_FORM_ACTION_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCampaign,
    IDLE_FORM_ACTION_STATE,
  );

  const anyPending =
    activatePending ||
    pausePending ||
    resumePending ||
    archivePending ||
    duplicatePending ||
    deletePending;

  const anySucceeded =
    activateState.success ||
    pauseState.success ||
    resumeState.success ||
    archiveState.success ||
    duplicateState.success ||
    deleteState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [
    activateState,
    pauseState,
    resumeState,
    archiveState,
    duplicateState,
    deleteState,
  ].find((state) => !state.success && state.message)?.message;

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {campaign.status === "DRAFT" && (
          <form action={activateAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              disabled={anyPending}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {activatePending ? "Activating…" : "Activate"}
            </button>
          </form>
        )}

        {campaign.status === "ACTIVE" && (
          <form action={pauseAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              disabled={anyPending}
              className="rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {pausePending ? "Pausing…" : "Pause"}
            </button>
          </form>
        )}

        {campaign.status === "PAUSED" && (
          <form action={resumeAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              disabled={anyPending}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {resumePending ? "Resuming…" : "Resume"}
            </button>
          </form>
        )}

        {campaign.status !== "ARCHIVED" && (
          <form action={archiveAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              disabled={anyPending}
              className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {archivePending ? "Archiving…" : "Archive"}
            </button>
          </form>
        )}

        <form action={duplicateAction}>
          <input type="hidden" name="campaignId" value={campaign.id} />
          <button
            disabled={anyPending}
            className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {duplicatePending ? "Duplicating…" : "Duplicate"}
          </button>
        </form>

        {campaign.status === "DRAFT" && (
          <form action={deleteAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              disabled={anyPending}
              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
