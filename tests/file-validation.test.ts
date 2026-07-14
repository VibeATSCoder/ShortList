import { describe, expect, it } from "vitest";

import {
  FileValidationError,
  MAX_RAW_RESUME_BYTES,
  sanitizeFileName,
  validateResumeFile,
} from "@/lib/file-validation";
import { MAX_TEXT_RESUME_CHARACTERS } from "@/lib/limits";

function dataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

describe("resume file validation", () => {
  it("accepts and decodes UTF-8 Persian text", () => {
    const bytes = Buffer.from("مهندس نرم‌افزار با تجربه React و Node.js", "utf8");
    const result = validateResumeFile({
      fileName: "رزومه.md",
      mimeType: "text/markdown",
      dataUrl: dataUrl("text/markdown", bytes),
    });

    expect(result.fileName).toBe("رزومه.md");
    expect(result.text).toContain("مهندس نرم‌افزار");
    expect(result.byteLength).toBe(bytes.length);
  });

  it("sanitizes paths, controls, and bidirectional filename overrides", () => {
    expect(sanitizeFileName("../folder\\candidate\u202Efdp.pdf")).toBe(
      "candidatefdp.pdf",
    );
  });

  it("rejects an extension or data type mismatch", () => {
    expect(() =>
      validateResumeFile({
        fileName: "candidate.txt",
        mimeType: "application/pdf",
        dataUrl: dataUrl("application/pdf", Buffer.from("%PDF-1.7\n%%EOF")),
      }),
    ).toThrowError(FileValidationError);
  });

  it("rejects fake PDFs despite a matching MIME declaration", () => {
    expect(() =>
      validateResumeFile({
        fileName: "candidate.pdf",
        mimeType: "application/pdf",
        dataUrl: dataUrl("application/pdf", Buffer.from("not a pdf")),
      }),
    ).toThrowError(/PDF header/);
  });

  it("accepts a DOCX-shaped ZIP and rejects a renamed arbitrary ZIP", () => {
    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const docx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("[Content_Types].xml\u0000word/document.xml", "latin1"),
      Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        Buffer.alloc(18),
      ]),
    ]);
    expect(
      validateResumeFile({
        fileName: "candidate.docx",
        mimeType,
        dataUrl: dataUrl(mimeType, docx),
      }).byteLength,
    ).toBe(docx.length);

    expect(() =>
      validateResumeFile({
        fileName: "candidate.docx",
        mimeType,
        dataUrl: dataUrl(mimeType, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("random.zip")])),
      }),
    ).toThrowError(/valid DOCX/);
  });

  it("rejects raw files above the Vercel-safe cap before decoding", () => {
    const oversized = Buffer.alloc(MAX_RAW_RESUME_BYTES + 1, 65).toString(
      "base64",
    );
    expect(() =>
      validateResumeFile({
        fileName: "candidate.txt",
        mimeType: "text/plain",
        dataUrl: `data:text/plain;base64,${oversized}`,
      }),
    ).toThrowError(/3 MB or smaller/);
  });

  it("rejects text that would otherwise be silently truncated", () => {
    const text = "a".repeat(MAX_TEXT_RESUME_CHARACTERS + 1);
    expect(() =>
      validateResumeFile({
        fileName: "candidate.txt",
        mimeType: "text/plain",
        dataUrl: dataUrl("text/plain", Buffer.from(text, "utf8")),
      }),
    ).toThrowError(/120,000 characters/);
  });
});
