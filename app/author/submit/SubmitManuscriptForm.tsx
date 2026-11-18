"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { submitManuscript } from "./actions";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function safeStorageName(name: string) {
  const extension = extensionOf(name);
  const base = name
    .slice(0, name.length - extension.length)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);

  return `${base || "manuscript"}${extension}`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Wraps the submission form. The manuscript is uploaded straight from the
 * browser to private storage (server actions only accept 1 MB), then the
 * form is submitted with just the file's reference. Errors are shown
 * above the submit button instead of crashing the page.
 */
export function SubmitManuscriptForm({
  uploadPrefix,
  children,
}: {
  uploadPrefix: string;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const uploaded = useRef<{ key: string; pathname: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const busy = progress !== null || isSubmitting;

  function showError(message: string) {
    setError(message);
    setProgress(null);
    // A verification token can only be used once; get a fresh one.
    window.turnstile?.reset?.();
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("manuscriptFile");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (!file || file.size === 0) {
      showError("Please upload the manuscript file.");
      return;
    }

    if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
      showError("Only PDF, DOC, and DOCX manuscript files are accepted.");
      return;
    }

    if (file.size > MAX_SIZE) {
      showError("The manuscript file must not exceed 20 MB.");
      return;
    }

    let pathname = uploaded.current?.key === fileKey(file)
      ? uploaded.current.pathname
      : "";

    if (!pathname) {
      try {
        setProgress(0);

        const blob = await upload(
          `${uploadPrefix}${safeStorageName(file.name)}`,
          file,
          {
            access: "private",
            handleUploadUrl: "/api/submission-uploads",
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) =>
              setProgress(Math.round(percentage)),
          },
        );

        pathname = blob.pathname;
        uploaded.current = { key: fileKey(file), pathname };
      } catch (uploadError) {
        showError(
          uploadError instanceof Error && uploadError.message
            ? `The manuscript could not be uploaded: ${uploadError.message}`
            : "The manuscript could not be uploaded. Please check your connection and try again.",
        );
        return;
      } finally {
        setProgress(null);
      }
    }

    formData.delete("manuscriptFile");
    formData.set("manuscriptBlobPathname", pathname);
    formData.set("manuscriptOriginalFilename", file.name);

    startTransition(async () => {
      const result = await submitManuscript(formData);

      if (result?.error) {
        showError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {children}

      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-black px-8 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"
      >
        {progress !== null
          ? `Uploading manuscript… ${progress}%`
          : isSubmitting
            ? "Submitting…"
            : "Submit Manuscript"}
      </button>
    </form>
  );
}
