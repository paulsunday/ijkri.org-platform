import type { MetadataRoute } from "next";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

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
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}