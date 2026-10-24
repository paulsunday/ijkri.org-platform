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
    headerHtml?: string;
    footerHtml?: string;
    margin?: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
};

const DEFAULT_PAGE_MARGIN = {
    top: "1.1in",
    bottom: "1in",
    left: "0.6in",
    right: "0.6in",
};

const NO_HEADER_FOOTER_MARGIN = {
    top: "0.5in",
    bottom: "0.5in",
    left: "0.6in",
    right: "0.6in",
};

/**
 * Renders a self-contained HTML document (its own inline <style>,
 * no external stylesheet requests) to a PDF buffer using a
 * headless Chromium instance.
 */
export async function renderHtmlToPdf(
    html: string,
    { headerHtml, footerHtml, margin }: PdfPageOptions = {},
): Promise<Uint8Array> {
    const browser = await launchBrowser();

    const hasHeaderFooter = Boolean(headerHtml || footerHtml);

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "load",
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin:
                margin ??
                (hasHeaderFooter
                    ? DEFAULT_PAGE_MARGIN
                    : NO_HEADER_FOOTER_MARGIN),
            displayHeaderFooter: hasHeaderFooter,
            headerTemplate: headerHtml || "<span></span>",
            footerTemplate: footerHtml || "<span></span>",
            printBackground: true,
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

/**
 * Renders a self-contained HTML document to a full-page PNG screenshot
 * using the same headless Chromium instance as `renderHtmlToPdf`, for
 * documents that are also offered as a shareable image (e.g. an invoice
 * a payer wants to paste into a chat rather than attach as a file).
 */
export async function renderHtmlToImage(
    html: string,
    { width = 1000 }: { width?: number } = {},
): Promise<Uint8Array> {
    const browser = await launchBrowser();

    try {
        const page = await browser.newPage();

        await page.setViewport({ width, height: 800 });

        await page.setContent(html, {
            waitUntil: "load",
        });

        const screenshot = await page.screenshot({
            type: "png",
            fullPage: true,
        });

        return screenshot;
    } finally {
        await browser.close();
    }
}
