import { prisma } from "@/lib/prisma";
import { escapeXml } from "@/lib/xml/escape-xml";

export const revalidate = 3600;

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

const FEED_TITLE =
    "International Journal of Knowledge, Research and Innovation";

const FEED_DESCRIPTION =
    "Latest published articles from " + FEED_TITLE + ".";

const MAX_ITEMS = 50;

function toRfc822(date: Date): string {
    return date.toUTCString();
}

export async function GET() {
    const articles = await prisma.article.findMany({
        where: {
            status: "PUBLISHED",
        },

        select: {
            slug: true,
            title: true,
            abstract: true,
            doi: true,
            publishedAt: true,
            updatedAt: true,

            journal: {
                select: {
                    name: true,
                },
            },

            authors: {
                select: {
                    fullName: true,
                },
                orderBy: {
                    sortOrder: "asc",
                },
            },
        },

        orderBy: {
            publishedAt: "desc",
        },

        take: MAX_ITEMS,
    });

    const generatedAt = new Date();

    const items = articles
        .map((article) => {
            const articleUrl = `${siteUrl}/articles/${article.slug}`;

            const authorNames = article.authors
                .map((author) => author.fullName)
                .join(", ");

            const pubDate = article.publishedAt ?? article.updatedAt;

            return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
      <pubDate>${toRfc822(pubDate)}</pubDate>
      <description>${escapeXml(article.abstract)}</description>${authorNames ? `\n      <dc:creator>${escapeXml(authorNames)}</dc:creator>` : ""}${article.doi ? `\n      <dc:identifier>doi:${escapeXml(article.doi)}</dc:identifier>` : ""}
    </item>`;
        })
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(generatedAt)}</lastBuildDate>
${items}
  </channel>
</rss>
`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
        },
    });
}
