import {
    getMeasurementType,
    type VariableProxy,
} from "@/lib/research-toolkit/formulation-plan";

export type PlanPreviewData = {
    generalObjective: string;
    firstObjective: string;
    firstQuestion: string;
    firstHypothesis: string;
    firstProxy: (VariableProxy & { variableName: string }) | null;
    lockedObjectives: number;
    lockedProxies: number;
    lockedTheories: number;
    lockedTips: number;
    hasMethodology: boolean;
};

function LockedLine({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <span aria-hidden="true">🔒</span>
            {children}
        </li>
    );
}

/**
 * Free-taster view of a generated plan. Only the preview fields are
 * passed in, so the locked content never reaches the browser.
 */
export default function PlanPreview({ preview }: { preview: PlanPreviewData }) {
    const proxy = preview.firstProxy;

    return (
        <div className="space-y-6">
            {preview.generalObjective ? (
                <div>
                    <p className="text-sm font-semibold text-slate-500">
                        General objective
                    </p>

                    <p className="mt-1">{preview.generalObjective}</p>
                </div>
            ) : null}

            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-semibold text-green-800">
                    Specific objective 1 — free preview
                </p>

                <p className="mt-2 font-medium">{preview.firstObjective}</p>

                {preview.firstQuestion ? (
                    <p className="mt-2 text-sm">
                        <span className="font-semibold">RQ1:</span>{" "}
                        {preview.firstQuestion}
                    </p>
                ) : null}

                {preview.firstHypothesis ? (
                    <p className="mt-1 text-sm">{preview.firstHypothesis}</p>
                ) : null}
            </div>

            {proxy ? (
                <div className="rounded-xl border border-slate-200 p-5">
                    <p className="text-sm font-semibold text-slate-500">
                        {proxy.variableName} — first proxy
                    </p>

                    <p className="mt-1 font-semibold">{proxy.name}</p>

                    <p className="mt-1 text-sm text-slate-700">
                        {proxy.definition}
                    </p>

                    <p className="mt-2 text-sm">
                        {getMeasurementType(proxy) === "SECONDARY_DATA" ? (
                            <>
                                <span className="font-semibold">
                                    Secondary data:
                                </span>{" "}
                                {proxy.formula}
                                {proxy.dataSource
                                    ? ` — ${proxy.dataSource}`
                                    : ""}
                            </>
                        ) : (
                            <>
                                <span className="font-semibold">Scale:</span>{" "}
                                {proxy.scaleName}
                                {proxy.scaleSource
                                    ? ` (${proxy.scaleSource})`
                                    : ""}
                            </>
                        )}
                    </p>
                </div>
            ) : null}

            <ul className="space-y-2">
                {preview.lockedObjectives > 0 ? (
                    <LockedLine>
                        {preview.lockedObjectives} more specific objective
                        {preview.lockedObjectives === 1 ? "" : "s"}, each
                        with its research question and hypothesis
                    </LockedLine>
                ) : null}

                {preview.lockedProxies > 0 ? (
                    <LockedLine>
                        {preview.lockedProxies} more proxies with their
                        validated scales or secondary-data sources
                    </LockedLine>
                ) : null}

                {preview.lockedTheories > 0 ? (
                    <LockedLine>
                        {preview.lockedTheories} underpinning{" "}
                        {preview.lockedTheories === 1 ? "theory" : "theories"}{" "}
                        and your conceptual framework
                    </LockedLine>
                ) : null}

                {preview.hasMethodology ? (
                    <LockedLine>
                        Methodology outline: design, sampling, instrument,
                        reliability and analysis
                    </LockedLine>
                ) : null}

                {preview.lockedTips > 0 ? (
                    <LockedLine>
                        {preview.lockedTips} tips on what you&apos;ll need
                        next for Chapter One
                    </LockedLine>
                ) : null}

                <LockedLine>Edit and regenerate your plan</LockedLine>
            </ul>
        </div>
    );
}
