import type { MetadataRoute } from "next";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.ijkri.org";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: [
                    "/",
                    "/about",
                    "/aims-scope",
                    "/archives",
                    "/current-issue",
                    "/author-guidelines",
                    "/publication-ethics",
                    "/peer-review",
                    "/call-for-papers",
                    "/editorial-board",
                    "/contact",
                    "/articles",
                    "/resources",
                    "/insights",
                    "/toolkit",
                    "/feed.xml",
                    "/api/oai",
                    "/api/production-files/",
                ],
                disallow: [
                    "/admin/",
                    "/author/",
                    "/reviewer/",
                    "/editor/",
                    "/copyeditor/",
                    "/typesetter/",
                    "/proofreader/",
                    "/api/",
                    "/login",
                    "/register",
                    "/forgot-password",
                    "/reset-password",
                    // Students' private topic pages; the /toolkit landing
                    // page itself stays indexable.
                    "/toolkit/",
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}