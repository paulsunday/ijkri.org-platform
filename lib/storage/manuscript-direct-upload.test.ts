import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getMock = vi.fn();

vi.mock("@vercel/blob", () => ({
  get: (...args: unknown[]) => getMock(...args),
  put: vi.fn(),
  del: vi.fn(),
}));

const { verifyPendingManuscriptUpload, pendingManuscriptPrefix } = await import(
  "./manuscript-direct-upload"
);

const USER = "user_123";
const PATH = `${pendingManuscriptPrefix(USER)}paper-AbC123.pdf`;

function storedBlob(bytes: Uint8Array, size = bytes.byteLength) {
  return {
    statusCode: 200,
    stream: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    headers: new Headers(),
    blob: {
      url: `https://store.private.blob.vercel-storage.com/${PATH}`,
      downloadUrl: `https://store.private.blob.vercel-storage.com/${PATH}?download=1`,
      pathname: PATH,
      contentType: "application/pdf",
      size,
    },
  };
}

const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

describe("verifyPendingManuscriptUpload", () => {
  beforeEach(() => {
    getMock.mockReset();
    process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = "test-token";
  });

  it("accepts the author's own valid PDF", async () => {
    getMock.mockResolvedValue(storedBlob(PDF));

    const result = await verifyPendingManuscriptUpload({
      pathname: PATH,
      originalFilename: "My Paper.pdf",
      userId: USER,
    });

    expect(result).toMatchObject({
      pathname: PATH,
      originalFilename: "My Paper.pdf",
      visibility: "private",
      category: "MANUSCRIPT",
    });
  });

  it("rejects a file in another user's folder without reading it", async () => {
    await expect(
      verifyPendingManuscriptUpload({
        pathname: PATH,
        originalFilename: "My Paper.pdf",
        userId: "someone_else",
      }),
    ).rejects.toThrow("upload the manuscript file again");

    expect(getMock).not.toHaveBeenCalled();
  });

  it("rejects path traversal", async () => {
    await expect(
      verifyPendingManuscriptUpload({
        pathname: `${pendingManuscriptPrefix(USER)}../other/x.pdf`,
        originalFilename: "x.pdf",
        userId: USER,
      }),
    ).rejects.toThrow();
  });

  it("rejects disallowed file types", async () => {
    await expect(
      verifyPendingManuscriptUpload({
        pathname: PATH,
        originalFilename: "virus.exe",
        userId: USER,
      }),
    ).rejects.toThrow("Only PDF, DOC, and DOCX");
  });

  it("rejects a file that is not really a PDF", async () => {
    getMock.mockResolvedValue(
      storedBlob(new TextEncoder().encode("just some text, not a pdf")),
    );

    await expect(
      verifyPendingManuscriptUpload({
        pathname: PATH,
        originalFilename: "paper.pdf",
        userId: USER,
      }),
    ).rejects.toThrow("does not look like a valid");
  });

  it("rejects files over 20 MB", async () => {
    getMock.mockResolvedValue(storedBlob(PDF, 21 * 1024 * 1024));

    await expect(
      verifyPendingManuscriptUpload({
        pathname: PATH,
        originalFilename: "paper.pdf",
        userId: USER,
      }),
    ).rejects.toThrow("must not exceed 20 MB");
  });

  it("asks for a re-upload when the file is missing", async () => {
    getMock.mockResolvedValue(null);

    await expect(
      verifyPendingManuscriptUpload({
        pathname: PATH,
        originalFilename: "paper.pdf",
        userId: USER,
      }),
    ).rejects.toThrow("could not be found");
  });
});
