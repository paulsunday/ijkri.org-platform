import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${siteUrl}/about`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/aims-scope`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/editorial-board`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/author-guidelines`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/publication-ethics`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/peer-review`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/call-for-papers`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/current-issue`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/archives`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/contact`,
            lastModified: new Date(),
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
        },
    });

    const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
        url: `${siteUrl}/articles/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "monthly",
        priority: 0.9,
    }));

    const issues = await prisma.issue.findMany({
        where: {
            isPublished: true,
        },
        select: {
            id: true,
            updatedAt: true,
        },
    });

    const issuePages: MetadataRoute.Sitemap = issues.map((issue) => ({
        url: `${siteUrl}/issues/${issue.id}`,
        lastModified: issue.updatedAt,
        changeFrequency: "monthly",
        priority: 0.8,
    }));

    return [...staticPages, ...issuePages, ...articlePages];
}