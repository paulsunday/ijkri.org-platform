import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const generatedAt = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: generatedAt,
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${siteUrl}/about`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/aims-scope`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/editorial-board`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/author-guidelines`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/publication-ethics`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/peer-review`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/call-for-papers`,
            lastModified: generatedAt,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/current-issue`,
            lastModified: generatedAt,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/archives`,
            lastModified: generatedAt,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/search`,
            lastModified: generatedAt,
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: `${siteUrl}/careers`,
            lastModified: generatedAt,
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${siteUrl}/contact`,
            lastModified: generatedAt,
            changeFrequency: "yearly",
            priority: 0.6,
        },
    ];

    const articles = await prisma.article.findMany({
        where: {
            status: "PUBLISHED",
        },

        select: {
            slug: true,
            updatedAt: true,
            publishedAt: true,
        },

        orderBy: {
            publishedAt: "desc",
        },
    });

    const articlePages: MetadataRoute.Sitemap =
        articles.map((article) => ({
            url: `${siteUrl}/articles/${article.slug}`,
            lastModified:
                article.updatedAt ||
                article.publishedAt ||
                generatedAt,
            changeFrequency: "monthly",
            priority: 0.9,
        }));

    return [...staticPages, ...articlePages];
}