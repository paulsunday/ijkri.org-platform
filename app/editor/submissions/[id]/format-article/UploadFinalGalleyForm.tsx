"use client";

import { useState } from "react";

import { uploadFinalGalleyPdf } from "./actions";

type UploadFinalGalleyFormProps = {
    submissionId: string;
};

export default function UploadFinalGalleyForm({
    submissionId,
}: UploadFinalGalleyFormProps) {
    const [fileName, setFileName] = useState<string | null>(
        null,
    );
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFileId, setUploadedFileId] = useState<
        string | null
    >(null);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        /*
         * React nulls out `event.currentTarget` once this handler's
         * synchronous portion finishes, so it must be captured before
         * the `await` below rather than read again afterward.
         */
        const formElement = event.currentTarget;

        setError(null);
        setIsUploading(true);

        try {
            const formData = new FormData(formElement);

            const result = await uploadFinalGalleyPdf(
                formData,
            );

            setUploadedFileId(result.productionFileId);
            formElement.reset();
            setFileName(null);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "The PDF could not be uploaded. Please try again.",
            );
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <section className="rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
                Already Have a Final PDF?
            </h2>

            <p className="mt-2 text-sm text-gray-600">
                If the manuscript has already been typeset
                elsewhere, upload the final galley PDF directly
                instead of using the formatting tool below. This
                becomes the submission&apos;s final publication
                file immediately.
            </p>

            <form
                onSubmit={handleSubmit}
                className="mt-5 flex flex-wrap items-center gap-4"
            >
                <input
                    type="hidden"
                    name="submissionId"
                    value={submissionId}
                />

                <input
                    type="file"
                    name="file"
                    accept="application/pdf,.pdf"
                    required
                    disabled={isUploading}
                    onChange={(event) =>
                        setFileName(
                            event.target.files?.[0]?.name ??
                                null,
                        )
                    }
                    className="block flex-1 rounded-lg border p-2.5 text-sm disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={isUploading || !fileName}
                    className="rounded-lg bg-slate-900 px-6 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    {isUploading
                        ? "Uploading…"
                        : "Upload Final PDF"}
                </button>
            </form>

            {error && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {error}
                </p>
            )}

            {uploadedFileId && (
                <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    Final galley PDF uploaded and saved. It will
                    be used automatically when this submission is
                    published.
                </p>
            )}
        </section>
    );
}
