import Link from "next/link";

import { requireRole } from "@/lib/auth/permissions";

import { createCampaign } from "../actions";
import { CampaignForm } from "../campaign-form";

export default async function NewReferralCampaignPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <div className="p-6">
      <Link
        href="/admin/referral-campaigns"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Referral Campaigns
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Create Referral Campaign</h1>

      <CampaignForm action={createCampaign} submitLabel="Create Campaign (Draft)" />
    </div>
  );
}
