import { Router } from "express";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { GatewayToken, getGatewayToken } from "@identity.com/solana-gateway-ts";

const router = Router();

const GATEKEEPER_NETWORK = new PublicKey('uniqobk8s9S59DC2L7E8URTCtD9s6P8zTJW7vr3bX1y');

/**
 * GET /api/solana-auth/config
 * Returns Civic configuration status
 */
router.get("/solana-auth/config", (_req, res) => {
  res.json({
    configured: true,
    gatekeeperNetwork: GATEKEEPER_NETWORK.toString(),
    network: "mainnet-beta",
    passType: "uniqueness",
  });
});

/**
 * POST /api/solana-auth/verify
 * Verifies a Civic Pass on-chain
 * Body: { wallet: string }
 */
router.post("/solana-auth/verify", async (req, res) => {
  const { wallet } = req.body ?? {};

  if (!wallet) {
    res.status(400).json({ error: "Missing required field: wallet" });
    return;
  }

  try {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const walletPublicKey = new PublicKey(wallet);
    
    // Check for active gateway token
    const gatewayToken = await getGatewayToken(
      connection,
      walletPublicKey,
      GATEKEEPER_NETWORK
    );

    if (!gatewayToken) {
      res.json({
        verified: false,
        hasCivicPass: false,
        wallet: wallet,
        message: "No Civic Pass found for this wallet",
      });
      return;
    }

    const token = GatewayToken.load(connection, gatewayToken);
    const isValid = token.isValid();
    const isActive = token.isActive();

    res.json({
      verified: isValid && isActive,
      hasCivicPass: true,
      wallet: wallet,
      gatewayToken: gatewayToken.toString(),
      status: token.state,
      expiry: token.expiryTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Civic] Verification error:", err);
    res.status(500).json({ error: "Verification failed", details: message });
  }
});

/**
 * GET /api/solana-auth/check/:wallet
 * Check Civic Pass status for a wallet
 */
router.get("/solana-auth/check/:wallet", async (req, res) => {
  const { wallet } = req.params;

  if (!wallet) {
    res.status(400).json({ error: "Missing wallet address" });
    return;
  }

  try {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const walletPublicKey = new PublicKey(wallet);
    
    const gatewayToken = await getGatewayToken(
      connection,
      walletPublicKey,
      GATEKEEPER_NETWORK
    );

    if (!gatewayToken) {
      res.json({
        hasPass: false,
        wallet: wallet,
      });
      return;
    }

    const token = GatewayToken.load(connection, gatewayToken);
    
    res.json({
      hasPass: token.isValid() && token.isActive(),
      wallet: wallet,
      gatewayToken: gatewayToken.toString(),
      state: token.state,
      expiry: token.expiryTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Check failed", details: message });
  }
});

export default router;
