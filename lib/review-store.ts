import "server-only";

import { del, get, list, put } from "@vercel/blob";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  reviewEventPath,
  reviewPackPath,
  type ReviewEvent,
  type ReviewFeedback,
  type ReviewPack,
} from "@/lib/reviews";

type ReviewStorageProvider = "blob" | "filesystem" | null;

const ENCRYPTION_MAGIC = Buffer.from("SLATS1", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;

function filesystemEncryption(): { key: Buffer; version: number } | null {
  const encoded = process.env.FILE_ENCRYPTION_KEY?.trim();
  const version = Number(process.env.FILE_ENCRYPTION_KEY_VERSION ?? 1);
  if (!encoded || !Number.isInteger(version) || version < 1 || version > 255) return null;
  const key = Buffer.from(encoded, "base64");
  return key.length === 32 ? { key, version } : null;
}

function provider(): ReviewStorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN) return "blob";
  if (process.env.REVIEW_STORAGE_DIR && filesystemEncryption()) return "filesystem";
  return null;
}

export function reviewStorageConfigured(): boolean {
  return provider() !== null;
}

export function reviewStorageMode(): "vercel-blob" | "encrypted-filesystem" | "disabled" {
  const selected = provider();
  return selected === "blob" ? "vercel-blob" : selected === "filesystem" ? "encrypted-filesystem" : "disabled";
}

function storageRoot(): string {
  const configured = process.env.REVIEW_STORAGE_DIR;
  if (!configured || !isAbsolute(configured)) throw new Error("REVIEW_STORAGE_DIR must be an absolute private path.");
  return resolve(configured);
}

function filePath(pathname: string): string {
  if (!/^[a-zA-Z0-9._/-]+$/.test(pathname) || pathname.includes("..")) {
    throw new Error("Invalid review storage path.");
  }
  const root = storageRoot();
  const target = resolve(root, pathname);
  const relation = relative(root, target);
  if (!relation || relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation)) {
    throw new Error("Review storage path escaped its private root.");
  }
  return target;
}

async function ensureParent(target: string): Promise<void> {
  const parent = resolve(target, "..");
  await mkdir(parent, { recursive: true, mode: 0o700 });
}

function encryptFilesystemValue(pathname: string, value: string | Uint8Array): Buffer {
  const configuration = filesystemEncryption();
  if (!configuration) throw new Error("A valid 32-byte FILE_ENCRYPTION_KEY is required.");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", configuration.key, iv);
  cipher.setAAD(Buffer.from(pathname, "utf8"));
  const plaintext = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([
    ENCRYPTION_MAGIC,
    Buffer.from([configuration.version]),
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ]);
}

function decryptFilesystemValue(pathname: string, value: Buffer): Buffer {
  const configuration = filesystemEncryption();
  if (!configuration) throw new Error("A valid 32-byte FILE_ENCRYPTION_KEY is required.");
  const headerBytes = ENCRYPTION_MAGIC.length + 1 + IV_BYTES + TAG_BYTES;
  if (value.length < headerBytes || !value.subarray(0, ENCRYPTION_MAGIC.length).equals(ENCRYPTION_MAGIC)) {
    throw new Error("Encrypted review object has an invalid header.");
  }
  const version = value[ENCRYPTION_MAGIC.length];
  if (version !== configuration.version) throw new Error("Encrypted review object uses an unavailable key version.");
  const ivStart = ENCRYPTION_MAGIC.length + 1;
  const tagStart = ivStart + IV_BYTES;
  const ciphertextStart = tagStart + TAG_BYTES;
  const decipher = createDecipheriv("aes-256-gcm", configuration.key, value.subarray(ivStart, tagStart));
  decipher.setAAD(Buffer.from(pathname, "utf8"));
  decipher.setAuthTag(value.subarray(tagStart, ciphertextStart));
  return Buffer.concat([decipher.update(value.subarray(ciphertextStart)), decipher.final()]);
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (provider() === "blob") {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return (await new Response(result.stream).json()) as T;
  }
  if (provider() === "filesystem") {
    try {
      const plaintext = decryptFilesystemValue(pathname, await readFile(filePath(pathname)));
      return JSON.parse(plaintext.toString("utf8")) as T;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }
  return null;
}

async function writeExclusive(pathname: string, value: string | Uint8Array): Promise<void> {
  if (provider() === "blob") {
    await put(pathname, typeof value === "string" ? value : Buffer.from(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: typeof value === "string" ? "application/json; charset=utf-8" : "application/octet-stream",
    });
    return;
  }
  if (provider() === "filesystem") {
    const target = filePath(pathname);
    await ensureParent(target);
    await writeFile(target, encryptFilesystemValue(pathname, value), { flag: "wx", mode: 0o600 });
    return;
  }
  throw new Error("Review storage is not configured.");
}

export async function saveReviewPack(pack: ReviewPack): Promise<void> {
  await writeExclusive(reviewPackPath(pack.id), JSON.stringify(pack));
}

export async function loadReviewPack(reviewId: string): Promise<ReviewPack | null> {
  return readJson<ReviewPack>(reviewPackPath(reviewId));
}

export async function saveReviewEvent(event: ReviewEvent): Promise<void> {
  await writeExclusive(reviewEventPath(event.reviewId, event.id), JSON.stringify(event));
}

export async function saveReviewResume(pathname: string, file: File): Promise<void> {
  if (provider() === "blob") {
    await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: file.type,
    });
    return;
  }
  await writeExclusive(pathname, new Uint8Array(await file.arrayBuffer()));
}

export async function loadReviewResume(pathname: string): Promise<ArrayBuffer | null> {
  if (provider() === "blob") {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return new Response(result.stream).arrayBuffer();
  }
  if (provider() === "filesystem") {
    try {
      const value = decryptFilesystemValue(pathname, await readFile(filePath(pathname)));
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }
  return null;
}

export async function deleteReviewObject(pathname: string): Promise<void> {
  if (provider() === "blob") {
    await del(pathname);
    return;
  }
  if (provider() === "filesystem") {
    await rm(filePath(pathname), { force: true });
  }
}

export async function listReviewEvents(reviewId: string): Promise<ReviewEvent[]> {
  let events: (ReviewEvent | null)[];
  if (provider() === "blob") {
    const result = await list({ prefix: `review-packs/${reviewId}/events/`, limit: 100 });
    events = await Promise.all(result.blobs.map((blob) => readJson<ReviewEvent>(blob.pathname)));
  } else if (provider() === "filesystem") {
    const directory = filePath(`review-packs/${reviewId}/events`);
    try {
      const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).slice(0, 100);
      events = await Promise.all(names.map((name) => readJson<ReviewEvent>(`review-packs/${reviewId}/events/${name}`)));
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return [];
      throw error;
    }
  } else {
    return [];
  }
  return events
    .filter((event): event is ReviewEvent => Boolean(event))
    .sort((a, b) => {
      const left = a.kind === "feedback" ? a.submittedAt : a.sentAt;
      const right = b.kind === "feedback" ? b.submittedAt : b.sentAt;
      return left.localeCompare(right);
    });
}

export async function listReviewFeedback(reviewId: string): Promise<ReviewFeedback[]> {
  return (await listReviewEvents(reviewId)).filter((event): event is ReviewFeedback => event.kind === "feedback");
}

export async function listAllReviewPacks(): Promise<ReviewPack[]> {
  if (provider() === "blob") {
    const result = await list({ prefix: "review-packs/", limit: 500 });
    const packs = await Promise.all(result.blobs.filter((blob) => blob.pathname.endsWith("/request.json")).map((blob) => readJson<ReviewPack>(blob.pathname)));
    return packs.filter((pack): pack is ReviewPack => Boolean(pack));
  }
  if (provider() === "filesystem") {
    const directory = filePath("review-packs");
    try {
      const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isDirectory()).slice(0, 500);
      const packs = await Promise.all(entries.map((entry) => readJson<ReviewPack>(`review-packs/${entry.name}/request.json`)));
      return packs.filter((pack): pack is ReviewPack => Boolean(pack));
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return [];
      throw error;
    }
  }
  return [];
}

export async function listActiveReviewPacks(): Promise<ReviewPack[]> {
  const now = Date.now();
  return (await listAllReviewPacks()).filter((pack) => new Date(pack.expiresAt).getTime() > now);
}

export async function deleteReviewPack(reviewId: string): Promise<number> {
  if (provider() === "blob") {
    const result = await list({ prefix: `review-packs/${reviewId}/`, limit: 500 });
    if (!result.blobs.length) return 0;
    await del(result.blobs.map((blob) => blob.pathname));
    return result.blobs.length;
  }
  if (provider() === "filesystem") {
    const directory = filePath(`review-packs/${reviewId}`);
    let count = 0;
    try {
      const entries = await readdir(directory, { recursive: true });
      count = entries.length;
      const details = await stat(directory);
      if (!details.isDirectory()) throw new Error("Review pack target is not a directory.");
      await rm(directory, { recursive: true, force: true });
      return count;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return 0;
      throw error;
    }
  }
  return 0;
}
