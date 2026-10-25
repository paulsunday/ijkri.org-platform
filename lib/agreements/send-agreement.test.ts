import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  submissionFindUniqueMock,
  agreementCreateMock,
  signatureCreateManyMock,
  transactionMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  submissionFindUniqueMock: vi.fn(),
  agreementCreateMock: vi.fn(),
  signatureCreateManyMock: vi.fn(),
  transactionMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: { findUnique: submissionFindUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email/templates", () => ({
  agreementSigningRequestEmail: vi.fn(({ signingUrl }) => ({
    subject: "s",
    html: `h:${signingUrl}`,
    text: `t:${signingUrl}`,
  })),
}));

const { sendPublicationAgreement } = await import("./send-agreement");

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission_1",
    displayId: "IJKRI-2026-001",
    title: "A Study of Something",
    journalId: "journal_1",
    author: {
      id: "author_1",
      name: "Jane Doe",
      email: "jane@example.com",
    },
    submissionAuthors: [
      {
        id: "sa_1",
        fullName: "Jane Doe",
        email: "jane@example.com",
        isCorresponding: true,
      },
      {
        id: "sa_2",
        fullName: "Co Author",
        email: "co@example.com",
        isCorresponding: false,
      },
    ],
    journal: {
      name: "IJKRI",
      publisher: { name: "Innovare Academic Publisher" },
      settings: {
        agreementSignatureMode: "CORRESPONDING_AUTHOR_ONLY",
        defaultLicenseType: "CC_BY_4",
      },
    },
    agreement: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  transactionMock.mockImplementation(async (callback) => {
    const tx = {
      publicationAgreement: {
        create: agreementCreateMock.mockResolvedValue({ id: "agreement_1" }),
      },
      agreementSignature: {
        createMany: signatureCreateManyMock,
      },
    };

    return callback(tx);
  });
});

describe("sendPublicationAgreement", () => {
  it("throws if the submission does not exist", async () => {
    submissionFindUniqueMock.mockResolvedValue(null);

    await expect(
      sendPublicationAgreement("missing"),
    ).rejects.toThrow("Submission not found.");
  });

  it("is a no-op if an agreement already exists", async () => {
    submissionFindUniqueMock.mockResolvedValue(
      makeSubmission({ agreement: { id: "existing" } }),
    );

    await sendPublicationAgreement("submission_1");

    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends one signature request to the logged-in corresponding author only", async () => {
    submissionFindUniqueMock.mockResolvedValue(makeSubmission());

    await sendPublicationAgreement("submission_1");

    expect(signatureCreateManyMock).toHaveBeenCalledTimes(1);

    const { data } = signatureCreateManyMock.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0].userId).toBe("author_1");
    expect(data[0].submissionAuthorId).toBeNull();
    expect(data[0].tokenHash).toBeNull();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].to).toBe("jane@example.com");
  });

  it("sends a tokenized signing link to every co-author with an email in ALL_AUTHORS mode", async () => {
    submissionFindUniqueMock.mockResolvedValue(
      makeSubmission({
        journal: {
          name: "IJKRI",
          publisher: { name: "Innovare Academic Publisher" },
          settings: {
            agreementSignatureMode: "ALL_AUTHORS",
            defaultLicenseType: "CC_BY_4",
          },
        },
      }),
    );

    await sendPublicationAgreement("submission_1");

    const { data } = signatureCreateManyMock.mock.calls[0][0];
    expect(data).toHaveLength(2);

    for (const row of data) {
      expect(row.userId).toBeNull();
      expect(row.tokenHash).not.toBeNull();
    }

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("skips emailing a co-author with no email on file, without failing", async () => {
    submissionFindUniqueMock.mockResolvedValue(
      makeSubmission({
        submissionAuthors: [
          {
            id: "sa_1",
            fullName: "Jane Doe",
            email: "jane@example.com",
            isCorresponding: true,
          },
          {
            id: "sa_2",
            fullName: "No Email Author",
            email: null,
            isCorresponding: false,
          },
        ],
        journal: {
          name: "IJKRI",
          publisher: { name: "Innovare Academic Publisher" },
          settings: {
            agreementSignatureMode: "ALL_AUTHORS",
            defaultLicenseType: "CC_BY_4",
          },
        },
      }),
    );

    await sendPublicationAgreement("submission_1");

    const { data } = signatureCreateManyMock.mock.calls[0][0];
    expect(data).toHaveLength(2);

    const noEmailRow = data.find(
      (row: { signerName: string }) => row.signerName === "No Email Author",
    );
    expect(noEmailRow.tokenHash).toBeNull();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
