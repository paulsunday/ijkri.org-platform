import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";

import { embedArticleMetadata } from "./embed-metadata";

/**
 * Fetches a just-published article's stored PDF, embeds citation
 * metadata into it, and replaces the stored file with the annotated
 * version. Only articles with an existing `pdfUrl` are affected.
 *
 * When the article's PDF is backed by a `ProductionFile` (the normal
 * editorial publication path), the annotated file is re-uploaded
 * privately and that record is updated in place, so the article keeps
 * being served through the access-checked download route instead of
 * a public blob URL. If there is no backing `ProductionFile` — an
 * editor pasted an external URL directly — the URL is left untouched
 * rather than silently replaced with a new public one.
 *
 * This never throws — a failure here should not block publication,
 * so callers should fire-and-forget or catch around it themselves.
 */
export async function embedPublishedArticlePdfMetadata(
    articleId: string,
): Promise<void> {
    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },

        select: {
            id: true,
            journalId: true,
            submissionId: true,
            title: true,
            doi: true,
            pdfUrl: true,

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

            keywords: {
                select: {
                    keyword: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!article?.pdfUrl) {
        return;
    }

    const finalProductionFile = article.submissionId
        ? await prisma.productionFile.findFirst({
              where: {
                  submissionId: article.submissionId,
                  fileType: {
                      in: ["PDF_GALLEY", "FINAL_PUBLICATION_FILE", "PROOF_FILE"],
                  },
              },
              orderBy: {
                  updatedAt: "desc",
              },
              select: {
                  id: true,
              },
          })
        : null;

    if (!finalProductionFile) {
        logger.info(
            "Skipped PDF metadata embedding: no production file backs this article's PDF",
            {
                articleId: article.id,
            },
        );

        return;
    }

    try {
        const response = await fetch(article.pdfUrl);

        if (!response.ok) {
            throw new Error(
                `Could not download the stored PDF (status ${response.status}).`,
            );
        }

        const originalBytes = await response.arrayBuffer();

        const annotatedBytes = await embedArticleMetadata(
            originalBytes,
            {
                title: article.title,
                authors: article.authors.map(
                    (author) => author.fullName,
                ),
                doi: article.doi,
                journalName: article.journal.name,
                keywords: article.keywords.map(
                    (item) => item.keyword.name,
                ),
            },
        );

        const annotatedFile = new File(
            [annotatedBytes as BlobPart],
            "article.pdf",
            {
                type: "application/pdf",
            },
        );

        const uploadResult = await uploadJournalFile({
            file: annotatedFile,
            category: "FINAL_ARTICLE",
            visibility: "private",

            metadata: {
                journalId: article.journalId,
                articleId: article.id,
                category: "FINAL_ARTICLE",
            },
        });

        await prisma.productionFile.update({
            where: {
                id: finalProductionFile.id,
            },
            data: {
                fileUrl: uploadResult.url,
                fileName: uploadResult.originalFilename,
                mimeType: uploadResult.mimeType,
                fileSize: uploadResult.size,
            },
        });

        logger.info("Embedded metadata into published article PDF", {
            event: "ARTICLE_PDF_METADATA_EMBEDDED",
            articleId: article.id,
        });
    } catch (error) {
        logger.error(
            "Failed to embed metadata into published article PDF",
            {
                articleId: article.id,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
        );
    }
}
