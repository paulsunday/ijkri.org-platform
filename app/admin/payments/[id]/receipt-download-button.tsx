"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ReceiptDownloadButtonProps = {
    paymentId: string;
    receiptNumber?: string | null;
    className?: string;
};

export function ReceiptDownloadButton({
    paymentId,
    receiptNumber,
    className = "",
}: ReceiptDownloadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    async function downloadReceipt() {
        if (loading) {
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(
                `/api/payments/${encodeURIComponent(
                    paymentId,
                )}/receipt`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            if (!response.ok) {
                let message =
                    "Unable to download the receipt.";

                try {
                    const body = (await response.json()) as {
                        error?: string;
                        message?: string;
                    };

                    message =
                        body.error ??
                        body.message ??
                        message;
                } catch {
                    // The endpoint may return a non-JSON error response.
                }

                throw new Error(message);
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error(
                    "The receipt file returned by the server is empty.",
                );
            }

            const contentDisposition =
                response.headers.get(
                    "content-disposition",
                );

            let fileName =
                receiptNumber
                    ? `${receiptNumber}.pdf`
                    : `receipt-${paymentId}.pdf`;

            const fileNameMatch =
                contentDisposition?.match(
                    /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i,
                );

            if (fileNameMatch?.[1]) {
                fileName = decodeURIComponent(
                    fileNameMatch[1].trim(),
                );
            }

            const objectUrl =
                window.URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = objectUrl;
            link.download = fileName;
            link.style.display = "none";

            document.body.appendChild(link);

            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(
                    objectUrl,
                );
            }, 1000);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to download the receipt.";

            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={className}>
            <Button
                type="button"
                onClick={downloadReceipt}
                disabled={loading}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />

                        Downloading...
                    </>
                ) : (
                    <>
                        <Download
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                        />

                        Download Receipt
                    </>
                )}
            </Button>

            {errorMessage && (
                <p
                    role="alert"
                    className="mt-2 text-sm text-red-700"
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}