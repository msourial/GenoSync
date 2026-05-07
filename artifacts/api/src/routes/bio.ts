import { Router, type IRouter, type Request, type Response } from "express";
import {
  encryptBioPayloadSafe,
  decryptBioPayloadSafe,
  type EncryptedEnvelope,
} from "../lib/kms";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Bio-data records encrypted via AWS KMS envelope encryption.
 * In production this is backed by Postgres; in demo/mock mode we keep an in-memory map.
 */
type BioRecord = {
  id: string;
  walletAddress: string;
  envelope: EncryptedEnvelope;
  createdAt: string;
};

const STORE = new Map<string, BioRecord>();

function newId(): string {
  return `bio_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * POST /api/bio/encrypt
 * Body: { walletAddress: string, payload: object | string }
 * Encrypts under AWS KMS and stores the envelope. Returns the record id + envelope metadata.
 */
router.post("/bio/encrypt", async (req: Request, res: Response) => {
  try {
    const { walletAddress, payload } = req.body ?? {};
    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    if (payload === undefined || payload === null) {
      return res.status(400).json({ error: "payload is required" });
    }

    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);

    const wallet = String(walletAddress).toLowerCase();
    const envelope = await encryptBioPayloadSafe(plaintext, {
      wallet,
      app: "genosync",
    });

    const id = newId();
    const record: BioRecord = {
      id,
      walletAddress: wallet,
      envelope,
      createdAt: new Date().toISOString(),
    };
    STORE.set(id, record);

    return res.status(201).json({
      id,
      walletAddress: record.walletAddress,
      kmsKeyId: envelope.kmsKeyId,
      algorithm: envelope.algorithm,
      encryptedAt: envelope.encryptedAt,
      ciphertextLength: envelope.ciphertext.length,
    });
  } catch (err) {
    logger.error({ err }, "/bio/encrypt failed");
    return res.status(500).json({ error: "encryption failed" });
  }
});

/**
 * GET /api/bio/:id
 * Returns the encrypted envelope (no plaintext). Useful for proving the data is encrypted.
 */
router.get("/bio/:id", (req: Request, res: Response) => {
  const id = req.params["id"];
  if (!id) return res.status(400).json({ error: "id required" });
  const record = STORE.get(String(id));
  if (!record) return res.status(404).json({ error: "not found" });
  return res.json({
    id: record.id,
    walletAddress: record.walletAddress,
    createdAt: record.createdAt,
    envelope: {
      ...record.envelope,
      ciphertext: record.envelope.ciphertext.slice(0, 64) + "...[truncated]",
    },
  });
});

/**
 * POST /api/bio/:id/decrypt
 * Body: { walletAddress: string }
 * Returns the decrypted payload. In production we'd gate this with the wallet signature;
 * for the demo we check the wallet matches the record's owner.
 */
router.post("/bio/:id/decrypt", async (req: Request, res: Response) => {
  try {
    const id = req.params["id"];
    const { walletAddress } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id required" });
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }
    const record = STORE.get(String(id));
    if (!record) return res.status(404).json({ error: "not found" });
    if (record.walletAddress !== String(walletAddress).toLowerCase()) {
      return res.status(403).json({ error: "wallet does not own this record" });
    }

    const plaintext = await decryptBioPayloadSafe(record.envelope, {
      wallet: record.walletAddress,
      app: "genosync",
    });

    let parsed: unknown;
    const asString = plaintext.toString("utf8");
    try {
      parsed = JSON.parse(asString);
    } catch {
      parsed = asString;
    }

    return res.json({
      id: record.id,
      walletAddress: record.walletAddress,
      decryptedAt: new Date().toISOString(),
      payload: parsed,
    });
  } catch (err) {
    logger.error({ err }, "/bio/:id/decrypt failed");
    return res.status(500).json({ error: "decryption failed" });
  }
});

/**
 * GET /api/bio/by-wallet/:address
 * Lists encrypted record ids for a wallet (envelope metadata only).
 */
router.get("/bio/by-wallet/:address", (req: Request, res: Response) => {
  const address = req.params["address"];
  if (!address) return res.status(400).json({ error: "address required" });
  const lowered = String(address).toLowerCase();
  const records = Array.from(STORE.values())
    .filter((r) => r.walletAddress === lowered)
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      kmsKeyId: r.envelope.kmsKeyId,
      algorithm: r.envelope.algorithm,
    }));
  return res.json({ walletAddress: lowered, count: records.length, records });
});

export default router;
