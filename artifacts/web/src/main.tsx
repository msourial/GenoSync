import { Buffer } from "buffer";
import process from "process";

// @solana/wallet-adapter and @solana/web3.js read Node-style globals at module
// evaluation time, so the polyfill MUST land on globalThis before any of those
// modules import. ESM evaluates all top-level imports before module body runs,
// so the bootstrap (which transitively imports @solana/*) is loaded dynamically
// AFTER these globals are set.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
(globalThis as unknown as { process: typeof process }).process = process;
(globalThis as unknown as { global: typeof globalThis }).global = globalThis;

void import("./bootstrap");
