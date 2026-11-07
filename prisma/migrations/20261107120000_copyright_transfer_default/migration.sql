-- Articles are paid, so new publication agreements use copyright
-- transfer instead of CC BY 4.0. Agreements already sent are unchanged.
ALTER TABLE "JournalSettings" ALTER COLUMN "defaultLicenseType" SET DEFAULT 'COPYRIGHT_TRANSFER';

UPDATE "JournalSettings" SET "defaultLicenseType" = 'COPYRIGHT_TRANSFER';

-- The licence line printed on formatted articles.
UPDATE "JournalSettings" AS js
SET "license" = '© ' || COALESCE(p."name", j."name") || '. All rights reserved.'
FROM "Journal" AS j
LEFT JOIN "Publisher" AS p ON p."id" = j."publisherId"
WHERE js."journalId" = j."id"
  AND (js."license" IS NULL OR js."license" ILIKE '%CC%BY%' OR js."license" ILIKE '%creative commons%');
