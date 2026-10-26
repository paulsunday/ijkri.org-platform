import type { StaticPageOverride } from "@/lib/static-pages/get-static-page";

export function StaticPageOverrideView({
  override,
}: {
  override: StaticPageOverride;
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold">{override.title}</h1>

      {override.tagline && (
        <p className="mt-3 text-lg text-gray-600">{override.tagline}</p>
      )}

      <div className="mt-8 whitespace-pre-wrap text-lg leading-8 text-gray-700">
        {override.body}
      </div>
    </main>
  );
}
