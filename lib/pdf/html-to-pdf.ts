import "server-only";

import type { Browser } from "puppeteer-core";

function isServerlessRuntime(): boolean {
    return Boolean(
        process.env.VERCEL ||
            process.env.AWS_LAMBDA_FUNCTION_NAME,
    );
}

async function launchBrowser(): Promise<Browser> {
    if (isServerlessRuntime()) {
        const [{ default: chromium }, puppeteer] =
            await Promise.all([
                import("@sparticuz/chromium"),
                import("puppeteer-core"),
            ]);

        return puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }

    /*
     * Local development has no serverless Linux Chromium build
     * available, so it launches the full `puppeteer` package's
     * own bundled browser instead. `puppeteer` is a dev-only
     * dependency for exactly this reason.
     */
    const puppeteerFull = await import("puppeteer");

    return puppeteerFull.launch({
        headless: true,
    }) as unknown as Promise<Browser>;
}

export type PdfPageOptions = {
    headerHtml: string;
    footerHtml: string;
};

/**
 * Renders a self-contained HTML document (its own inline <style>,
 * no external stylesheet requests) to a PDF buffer using a
 * headless Chromium instance.
 */
export async function renderHtmlToPdf(
    html: string,
    { headerHtml, footerHtml }: PdfPageOptions,
): Promise<Uint8Array> {
    const browser = await launchBrowser();

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "load",
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
                top: "1.1in",
                bottom: "1in",
                left: "0.6in",
                right: "0.6in",
            },
            displayHeaderFooter: true,
            headerTemplate: headerHtml,
            footerTemplate: footerHtml,
            printBackground: true,
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}
