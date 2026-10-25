import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signatureFindUniqueMock,
  signatureUpdateMock,
  signatureCountMock,
  agreementFindUniqueMock,
  agreementUpdateMock,
  notificationCreateMock,
  notifyStaffActionNeededMock,
  sendChatNotificationMock,
  sendEmailMock,
  uploadJournalFileMock,
  renderSignedAgreementPdfMock,
} = vi.hoisted(() => ({
  signatureFindUniqueMock: vi.fn(),
  signatureUpdateMock: vi.fn(),
  signatureCountMock: vi.fn(),
  agreementFindUniqueMock: vi.fn(),
  agreementUpdateMock: vi.fn(),
  notificationCreateMock: vi.fn(),
  notifyStaffActionNeededMock: vi.fn(),
  sendChatNotificationMock: vi.fn(),
  sendEmailMock: vi.fn(),
  uploadJournalFileMock: vi.fn(),
  renderSignedAgreementPdfMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agreementSignature: {
      findUnique: signatureFindUniqueMock,
      update: signatureUpdateMock,
      count: signatureCountMock,
    },
    publicationAgreement: {
      findUnique: agreementFindUniqueMock,
      update: agreementUpdateMock,
    },
    notification: { create: notificationCreateMock },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email/templates", () => ({
  agreementFullySignedEmail: vi.fn(() => ({
    subject: "s",
    html: "h",
    text: "t",
  })),
}));

vi.mock("@/lib/notifications/notify-staff", () => ({
  notifyStaffActionNeeded: notifyStaffActionNeededMock,
}));

vi.mock("@/lib/notifications/notify-webhook", () => ({
  sendChatNotification: sendChatNotificationMock,
}));

vi.mock("@/lib/storage/blob", () => ({
  uploadJournalFile: uploadJournalFileMock,
}));

vi.mock("./render-signed-agreement-pdf", () => ({
  renderSignedAgreementPdf: renderSignedAgreementPdfMock,
}));

const { recordAgreementSignature } = await import("./sign-agreement");

function makeSubmission() {
  return {
    id: "submission_1",
    displayId: "IJKRI-2026-001",
    title: "A Study of Something",
    journalId: "journal_1",
    journal: { id: "journal_1", name: "IJKRI" },
    author: {
      id: "author_1",
      name: "Jane Doe",
      email: "jane@example.com",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadJournalFileMock.mockResolvedValue({
    url: "https://blob.example/agreements/signed.pdf",
  });
  renderSignedAgreementPdfMock.mockResolvedValue(
    new Uint8Array([1, 2, 3]),
  );
});

describe("recordAgreementSignature", () => {
  it("throws if the signature record does not exist", async () => {
    signatureFindUniqueMock.mockResolvedValue(null);

    await expect(
      recordAgreementSignature({
        signatureId: "missing",
        typedLegalName: "Jane Doe",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow("Signature record not found.");
  });

  it("throws if the signature has already been signed", async () => {
    signatureFindUniqueMock.mockResolvedValue({
      id: "sig_1",
      agreementId: "agreement_1",
      signedAt: new Date(),
    });

    await expect(
      recordAgreementSignature({
        signatureId: "sig_1",
        typedLegalName: "Jane Doe",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow("already been signed");
  });

  it("throws if the typed legal name is blank", async () => {
    signatureFindUniqueMock.mockResolvedValue({
      id: "sig_1",
      agreementId: "agreement_1",
      signedAt: null,
    });

    await expect(
      recordAgreementSignature({
        signatureId: "sig_1",
        typedLegalName: "   ",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow("type your full legal name");

    expect(signatureUpdateMock).not.toHaveBeenCalled();
  });

  it("marks the agreement PARTIALLY_SIGNED and does not finalize when signers remain", async () => {
    signatureFindUniqueMock.mockResolvedValue({
      id: "sig_1",
      agreementId: "agreement_1",
      signedAt: null,
    });
    signatureCountMock.mockResolvedValue(1);

    await recordAgreementSignature({
      signatureId: "sig_1",
      typedLegalName: "Jane Doe",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });

    expect(signatureUpdateMock).toHaveBeenCalledWith({
      where: { id: "sig_1" },
      data: {
        typedLegalName: "Jane Doe",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        signedAt: expect.any(Date),
      },
    });

    expect(agreementUpdateMock).toHaveBeenCalledWith({
      where: { id: "agreement_1" },
      data: { status: "PARTIALLY_SIGNED" },
    });

    expect(uploadJournalFileMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("finalizes the agreement when the last signature is recorded", async () => {
    signatureFindUniqueMock.mockResolvedValue({
      id: "sig_1",
      agreementId: "agreement_1",
      signedAt: null,
    });
    signatureCountMock.mockResolvedValue(0);

    agreementFindUniqueMock.mockResolvedValue({
      id: "agreement_1",
      submissionId: "submission_1",
      agreementText: "Full agreement text",
      signatures: [
        {
          signerName: "Jane Doe",
          signerEmail: "jane@example.com",
          typedLegalName: "Jane Doe",
          signedAt: new Date(),
          ipAddress: "127.0.0.1",
        },
      ],
      submission: makeSubmission(),
    });

    await recordAgreementSignature({
      signatureId: "sig_1",
      typedLegalName: "Jane Doe",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });

    expect(renderSignedAgreementPdfMock).toHaveBeenCalledTimes(1);
    expect(uploadJournalFileMock).toHaveBeenCalledTimes(1);

    expect(agreementUpdateMock).toHaveBeenCalledWith({
      where: { id: "agreement_1" },
      data: {
        status: "SIGNED",
        signedAt: expect.any(Date),
        pdfFileUrl: "https://blob.example/agreements/signed.pdf",
        pdfSha256: expect.any(String),
      },
    });

    expect(notificationCreateMock).toHaveBeenCalledTimes(1);
    expect(notifyStaffActionNeededMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendChatNotificationMock).toHaveBeenCalledTimes(1);
  });
});
