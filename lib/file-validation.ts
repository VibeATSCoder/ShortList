import {
  MAX_RAW_RESUME_BYTES,
  MAX_TEXT_RESUME_CHARACTERS,
} from "@/lib/limits";

export { MAX_RAW_RESUME_BYTES } from "@/lib/limits";

export const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export type ResumeMimeType = (typeof SUPPORTED_RESUME_MIME_TYPES)[number];

export type FileValidationCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_FILE_NAME"
  | "INVALID_FILE_ENCODING"
  | "FILE_TYPE_MISMATCH"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "INVALID_PDF"
  | "INVALID_DOCX"
  | "INVALID_TEXT"
  | "TEXT_TOO_LONG";

export class FileValidationError extends Error {
  readonly code: FileValidationCode;
  readonly status: 400 | 413;

  constructor(code: FileValidationCode, message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "FileValidationError";
    this.code = code;
    this.status = status;
  }
}

export interface ResumeFileInput {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export interface ValidatedResumeFile {
  fileName: string;
  mimeType: ResumeMimeType;
  byteLength: number;
  bytes: Buffer;
  /** Canonical data URL suitable for an upstream file input. */
  dataUrl: string;
  /** Present only for TXT and Markdown inputs after strict UTF-8 decoding. */
  text?: string;
}

const MIME_EXTENSIONS: Record<ResumeMimeType, readonly string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "text/plain": ["txt"],
  "text/markdown": ["md", "markdown"],
};

const PDF_HEADER = Buffer.from("%PDF-", "ascii");
const PDF_EOF = Buffer.from("%%EOF", "ascii");

export function isResumeMimeType(value: string): value is ResumeMimeType {
  return (SUPPORTED_RESUME_MIME_TYPES as readonly string[]).includes(value);
}

export function sanitizeFileName(value: string): string {
  const leafName = value.normalize("NFKC").split(/[\\/]/).pop() ?? "";
  const sanitized = leafName
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/[^\p{L}\p{N}\p{M}\s._()-]/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim();

  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new FileValidationError(
      "INVALID_FILE_NAME",
      "The resume filename is invalid.",
    );
  }

  return Array.from(sanitized).slice(0, 180).join("");
}

function decodedByteEstimate(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function decodeCanonicalBase64(base64: string): Buffer {
  if (!base64 || base64.length % 4 !== 0) {
    throw new FileValidationError(
      "INVALID_FILE_ENCODING",
      "The resume is not valid base64 data.",
    );
  }

  if (decodedByteEstimate(base64) > MAX_RAW_RESUME_BYTES) {
    throw new FileValidationError(
      "FILE_TOO_LARGE",
      "Each resume must be 3 MB or smaller.",
      413,
    );
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.toString("base64") !== base64) {
    throw new FileValidationError(
      "INVALID_FILE_ENCODING",
      "The resume is not valid canonical base64 data.",
    );
  }
  return bytes;
}

function validateFileExtension(fileName: string, mimeType: ResumeMimeType): void {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !MIME_EXTENSIONS[mimeType].includes(extension)) {
    throw new FileValidationError(
      "FILE_TYPE_MISMATCH",
      "The filename extension does not match the declared resume type.",
    );
  }
}

function validatePdf(bytes: Buffer): void {
  if (bytes.length < PDF_HEADER.length || !bytes.subarray(0, 5).equals(PDF_HEADER)) {
    throw new FileValidationError(
      "INVALID_PDF",
      "The uploaded file does not contain a valid PDF header.",
    );
  }

  const tail = bytes.subarray(Math.max(0, bytes.length - 1_024));
  if (tail.indexOf(PDF_EOF) === -1) {
    throw new FileValidationError(
      "INVALID_PDF",
      "The uploaded PDF appears incomplete or malformed.",
    );
  }
}

function validateDocx(bytes: Buffer): void {
  const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const endOfCentralDirectory = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const directoryText = bytes.toString("latin1");
  const zipTail = bytes.subarray(Math.max(0, bytes.length - 65_557));
  const endRecordIndex = zipTail.lastIndexOf(endOfCentralDirectory);
  if (
    bytes.length < 4 ||
    !bytes.subarray(0, 4).equals(zipHeader) ||
    endRecordIndex === -1 ||
    zipTail.length - endRecordIndex < 22 ||
    !directoryText.includes("[Content_Types].xml") ||
    !directoryText.includes("word/document.xml")
  ) {
    throw new FileValidationError(
      "INVALID_DOCX",
      "The uploaded file is not a valid DOCX document.",
    );
  }
}

function validateText(bytes: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new FileValidationError(
      "INVALID_TEXT",
      "Text resumes must use valid UTF-8 encoding.",
    );
  }

  if (
    !text.replace(/^\uFEFF/u, "").trim() ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
  ) {
    throw new FileValidationError(
      "INVALID_TEXT",
      "The uploaded text file is empty or contains binary data.",
    );
  }
  if (text.length > MAX_TEXT_RESUME_CHARACTERS) {
    throw new FileValidationError(
      "TEXT_TOO_LONG",
      `Text resumes must contain no more than ${MAX_TEXT_RESUME_CHARACTERS.toLocaleString("en-US")} characters.`,
      413,
    );
  }
  return text;
}

/**
 * Validates the declaration, extension, base64 encoding, decoded size, and
 * lightweight file signature for a resume before it is sent upstream.
 */
export function validateResumeFile(input: ResumeFileInput): ValidatedResumeFile {
  if (!isResumeMimeType(input.mimeType)) {
    throw new FileValidationError(
      "UNSUPPORTED_FILE_TYPE",
      "Only PDF, DOCX, TXT, and Markdown resumes are supported.",
    );
  }

  const fileName = sanitizeFileName(input.fileName);
  validateFileExtension(fileName, input.mimeType);

  const match = input.dataUrl.match(
    /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/,
  );
  if (!match || match[1] !== input.mimeType) {
    throw new FileValidationError(
      "INVALID_FILE_ENCODING",
      "The resume encoding does not match its declared type.",
    );
  }

  const base64 = match[2];
  const bytes = decodeCanonicalBase64(base64);
  if (bytes.length === 0) {
    throw new FileValidationError("EMPTY_FILE", "The resume file is empty.");
  }

  const isBinaryDocument =
    input.mimeType === "application/pdf" ||
    input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const text = isBinaryDocument ? undefined : validateText(bytes);
  if (input.mimeType === "application/pdf") validatePdf(bytes);
  if (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") validateDocx(bytes);

  return {
    fileName,
    mimeType: input.mimeType,
    byteLength: bytes.length,
    bytes,
    dataUrl: `data:${input.mimeType};base64,${base64}`,
    ...(text === undefined ? {} : { text }),
  };
}
