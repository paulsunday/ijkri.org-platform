import type { LicenseType } from "@/lib/generated/prisma";

/**
 * Bump this whenever the wording below changes. Existing agreements
 * keep the text snapshot they were sent with; this version string is
 * only stored alongside that snapshot for audit purposes.
 */
export const AGREEMENT_TEMPLATE_VERSION = "2026-01";

export type AgreementTextInput = {
  licenseType: LicenseType;
  journalName: string;
  publisherName: string;
  manuscriptTitle: string;
  manuscriptDisplayId: string;
  correspondingAuthorName: string;
};

function licenseClause(
  licenseType: LicenseType,
  publisherName: string,
): string {
  if (licenseType === "CC_BY_4") {
    return (
      "LICENSE GRANT (Creative Commons Attribution 4.0 International — CC BY 4.0)\n\n" +
      "The Author(s) retain copyright in the Article. By signing this agreement, " +
      "the Author(s) grant the Journal, its Publisher, and all readers a " +
      "perpetual, worldwide, non-exclusive license to reproduce, distribute, " +
      "publicly perform, and create derivative works from the Article, in any " +
      "medium, provided that appropriate credit is given to the Author(s), a " +
      "link to the license is provided, and any changes made are indicated. " +
      "This license does not revoke the Author(s)' underlying copyright."
    );
  }

  return (
    `COPYRIGHT TRANSFER\n\n` +
    `The Author(s) hereby assign to ${publisherName} ("the Publisher") all ` +
    "rights, title, and interest in copyright in the final, accepted version " +
    "of the Article, including all subsidiary rights, for the full term of " +
    "copyright and any renewals or extensions thereof. The Publisher becomes " +
    "the exclusive rights holder in the Article from the date of publication. " +
    "Notwithstanding this assignment, the Author(s) retain the right to: " +
    "(a) reuse the Article, in whole or in part, in a thesis or dissertation; " +
    "(b) reuse the Article for classroom teaching purposes; and " +
    "(c) post the accepted manuscript version on a personal or institutional " +
    "website, with full citation to the published version."
  );
}

/**
 * Builds the full agreement text shown to signers, as a snapshot
 * stored verbatim on PublicationAgreement.agreementText — later
 * edits to this function never change an agreement already sent.
 */
export function buildAgreementText(
  input: AgreementTextInput,
): string {
  return [
    `PUBLICATION AGREEMENT`,
    ``,
    `Journal: ${input.journalName}`,
    `Publisher: ${input.publisherName}`,
    `Manuscript ID: ${input.manuscriptDisplayId}`,
    `Manuscript Title: "${input.manuscriptTitle}"`,
    `Corresponding Author: ${input.correspondingAuthorName}`,
    ``,
    `This Publication Agreement ("Agreement") is entered into between the ` +
      `undersigned Author(s) of the above-referenced manuscript (the ` +
      `"Article") and ${input.journalName} (the "Journal").`,
    ``,
    `1. WARRANTY`,
    ``,
    `The Author(s) warrant that the Article is their original work, has not ` +
      `been published elsewhere, does not infringe any third-party rights, ` +
      `and that all Author(s) have approved submission of the Article and ` +
      `this Agreement.`,
    ``,
    `2. ${
      input.licenseType === "CC_BY_4" ? "LICENSE GRANT" : "COPYRIGHT TRANSFER"
    }`,
    ``,
    licenseClause(input.licenseType, input.publisherName),
    ``,
    `3. ACKNOWLEDGEMENT`,
    ``,
    `By typing their full legal name below and submitting this form, the ` +
      `signer acknowledges that they have read, understood, and agree to be ` +
      `bound by the terms of this Agreement with respect to the Article.`,
  ].join("\n");
}
