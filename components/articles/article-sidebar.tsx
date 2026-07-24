type Props = {
    journalName: string;
    volume?: number;
    issue?: number;
    publishedDate: string;
    doi?: string | null;
    issnPrint?: string | null;
    issnOnline?: string | null;
};

export default function ArticleSidebar({
    journalName,
    volume,
    issue,
    publishedDate,
    doi,
    issnPrint,
    issnOnline,
}: Props) {
    return (
        <aside className="sticky top-24 space-y-6">

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

                <div className="aspect-[3/4] bg-gradient-to-br from-blue-900 to-slate-800 flex items-center justify-center p-6">

                    <div className="text-center text-white">

                        <div className="text-xs uppercase tracking-[0.25em] opacity-80">
                            Journal
                        </div>

                        <h2 className="mt-4 text-lg font-bold leading-snug">
                            {journalName}
                        </h2>

                    </div>

                </div>

            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">

                <h3 className="text-lg font-bold">
                    Publication Details
                </h3>

                <dl className="mt-6 space-y-5 text-sm">

                    <div>
                        <dt className="font-semibold text-slate-600">
                            Volume
                        </dt>

                        <dd className="mt-1 font-medium">
                            {volume ?? "-"}
                        </dd>
                    </div>

                    <div>
                        <dt className="font-semibold text-slate-600">
                            Issue
                        </dt>

                        <dd className="mt-1 font-medium">
                            {issue ?? "-"}
                        </dd>
                    </div>

                    <div>
                        <dt className="font-semibold text-slate-600">
                            Published
                        </dt>

                        <dd className="mt-1">
                            {publishedDate}
                        </dd>
                    </div>

                    <div>
                        <dt className="font-semibold text-slate-600">
                            Online ISSN
                        </dt>

                        <dd className="mt-1">
                            {issnOnline || "Pending"}
                        </dd>
                    </div>

                    <div>
                        <dt className="font-semibold text-slate-600">
                            Print ISSN
                        </dt>

                        <dd className="mt-1">
                            {issnPrint || "pending"}
                        </dd>
                    </div>

                    {doi && (
                        <div>
                            <dt className="font-semibold text-slate-600">
                                DOI
                            </dt>

                            <dd className="mt-1 break-all text-blue-700">
                                {doi}
                            </dd>
                        </div>
                    )}

                </dl>

            </div>

        </aside>
    );
}