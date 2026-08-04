import type { ActiveCampaignSummary } from "@/lib/campaigns/get-active-campaigns";

export function CampaignBanners({ campaigns }: { campaigns: ActiveCampaignSummary[] }) {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50"
        >
          {campaign.bannerImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.bannerImageUrl}
              alt={campaign.name}
              className="h-32 w-full object-cover"
            />
          )}

          <div className="p-4">
            <p className="font-bold text-amber-900">{campaign.name}</p>
            {campaign.description && (
              <p className="mt-1 text-sm text-amber-800">{campaign.description}</p>
            )}
            <p className="mt-1 text-xs text-amber-700">
              Ends {new Date(campaign.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
