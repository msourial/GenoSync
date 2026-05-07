import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
  type GenerateDataKeyCommandOutput,
} from "@aws-sdk/client-kms";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { logger } from "./logger";

/**
 * AWS KMS envelope encryption for Bioledger health/bio data.
 *
 * Pattern:
 *  - KMS generates a 256-bit data key (DEK).
 *  - We encrypt the user's bio payload locally with AES-256-GCM using the plaintext DEK.
 *  - We persist only the ciphertext + IV + auth tag + the KMS-encrypted DEK ("ciphertextBlob").
 *  - On read: KMS.Decrypt the DEK, then AES-GCM decrypt the payload.
 *
 * The plaintext DEK is never persisted; raw bio data never leaves the encrypted envelope.
 */

const REGION = process.env["AWS_REGION"] ?? "us-east-1";
const KEY_ID =
  process.env["BIOLEDGER_KMS_KEY_ID"] ??
  process.env["AWS_KMS_KEY_ID"] ??
  "alias/bioledger-userdata";

let cachedClient: KMSClient | null = null;

function getClient(): KMSClient {
  if (cachedClient) return cachedClient;
  cachedClient = new KMSClient({ region: REGION });
  return cachedClient;
}

export interface EncryptedEnvelope {
  ciphertext: string; // base64
  iv: string; // base64 (12 bytes for GCM)
  authTag: string; // base64 (16 bytes)
  encryptedDataKey: string; // base64 ciphertext blob from KMS
  kmsKeyId: string;
  algorithm: "AES-256-GCM";
  encryptedAt: string; // ISO timestamp
}

export async function encryptBioPayload(
  plaintext: string | Buffer,
  context?: Record<string, string>,
): Promise<EncryptedEnvelope> {
  const client = getClient();

  const dataKey: GenerateDataKeyCommandOutput = await client.send(
    new GenerateDataKeyCommand({
      KeyId: KEY_ID,
      KeySpec: "AES_256",
      EncryptionContext: context,
    }),
  );

  if (!dataKey.Plaintext || !dataKey.CiphertextBlob) {
    throw new Error("KMS GenerateDataKey returned an empty key");
  }

  const dek = Buffer.from(dataKey.Plaintext);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const input = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // wipe plaintext key from memory ASAP
  dek.fill(0);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encryptedDataKey: Buffer.from(dataKey.CiphertextBlob).toString("base64"),
    kmsKeyId: dataKey.KeyId ?? KEY_ID,
    algorithm: "AES-256-GCM",
    encryptedAt: new Date().toISOString(),
  };
}

export async function decryptBioPayload(
  envelope: EncryptedEnvelope,
  context?: Record<string, string>,
): Promise<Buffer> {
  const client = getClient();

  const decryptedKey = await client.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(envelope.encryptedDataKey, "base64"),
      EncryptionContext: context,
      KeyId: envelope.kmsKeyId,
    }),
  );

  if (!decryptedKey.Plaintext) {
    throw new Error("KMS Decrypt returned an empty data key");
  }

  const dek = Buffer.from(decryptedKey.Plaintext);
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      dek,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } finally {
    dek.fill(0);
  }
}

/**
 * Mock-mode fallback for local dev without AWS credentials.
 * Returns a structurally-valid envelope but does NOT call KMS — DO NOT use in production.
 * Activated when BIOLEDGER_KMS_MOCK=1 is set.
 */
export function isMockMode(): boolean {
  return process.env["BIOLEDGER_KMS_MOCK"] === "1";
}

export async function encryptBioPayloadSafe(
  plaintext: string | Buffer,
  context?: Record<string, string>,
): Promise<EncryptedEnvelope> {
  if (isMockMode()) {
    logger.warn("[KMS] mock mode active — using local AES key (NOT for production)");
    const dek = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    const input = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      encryptedDataKey: dek.toString("base64"),
      kmsKeyId: "MOCK_LOCAL_KEY",
      algorithm: "AES-256-GCM",
      encryptedAt: new Date().toISOString(),
    };
  }
  return encryptBioPayload(plaintext, context);
}

export async function decryptBioPayloadSafe(
  envelope: EncryptedEnvelope,
  context?: Record<string, string>,
): Promise<Buffer> {
  if (envelope.kmsKeyId === "MOCK_LOCAL_KEY") {
    const dek = Buffer.from(envelope.encryptedDataKey, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      dek,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
  return decryptBioPayload(envelope, context);
}
