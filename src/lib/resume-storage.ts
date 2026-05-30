import { randomBytes, randomUUID, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Request } from "express";

import { env } from "../config/env";

const storageDirectory = path.resolve(process.cwd(), "storage/private/resumes");
const algorithm = "aes-256-gcm";

type EncryptedResumePayload = {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

type ResumeFileContent = {
  originalName: string;
  mimeType: string;
  data: string;
};

function getFilePath(fileId: string) {
  return path.join(storageDirectory, `${fileId}.enc`);
}

function deriveKey(salt: Buffer) {
  return scryptSync(env.resumeEncryptionSecret, salt, 32);
}

function getRequestBaseUrl(request: Request) {
  if (env.backendPublicUrl) {
    return env.backendPublicUrl.replace(/\/$/, "");
  }

  const protocol = request.header("x-forwarded-proto") ?? request.protocol;
  const host = request.header("x-forwarded-host") ?? request.get("host");

  return `${protocol}://${host ?? "localhost:4000"}`.replace(/\/$/, "");
}

export function buildResumeAccessUrl(request: Request, fileId: string) {
  return `${getRequestBaseUrl(request)}/api/files/resumes/${fileId}`;
}

export function extractManagedResumeFileId(resumeUrl?: string | null) {
  if (!resumeUrl) {
    return null;
  }

  const match = resumeUrl.match(/\/files\/resumes\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

export async function storeEncryptedResumeFile(file: Express.Multer.File) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(salt);
  const cipher = createCipheriv(algorithm, key, iv);

  const plaintext = Buffer.from(
    JSON.stringify({
      originalName: file.originalname,
      mimeType: file.mimetype,
      data: file.buffer.toString("base64")
    } satisfies ResumeFileContent),
    "utf8"
  );

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const fileId = randomUUID();

  const payload: EncryptedResumePayload = {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };

  await fs.mkdir(storageDirectory, { recursive: true });
  await fs.writeFile(getFilePath(fileId), JSON.stringify(payload), { encoding: "utf8", mode: 0o600 });

  return {
    fileId,
    originalName: file.originalname
  };
}

export async function readEncryptedResumeFile(fileId: string) {
  const rawPayload = await fs.readFile(getFilePath(fileId), "utf8");
  const payload = JSON.parse(rawPayload) as EncryptedResumePayload;

  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = deriveKey(salt);
  const decipher = createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const content = JSON.parse(plaintext) as ResumeFileContent;

  return {
    originalName: content.originalName,
    mimeType: content.mimeType,
    buffer: Buffer.from(content.data, "base64")
  };
}

export async function deleteEncryptedResumeFile(fileId: string) {
  await fs.rm(getFilePath(fileId), { force: true });
}
