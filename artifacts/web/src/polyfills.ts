// Browser polyfills for Solana wallet adapter / web3.js, which expect
// Node-style `Buffer`, `global`, and `process` globals.
//
// THIS FILE MUST BE IMPORTED BEFORE ANY OTHER MODULE IN main.tsx — ESM
// hoists imports, but a single polyfill module loaded first guarantees its
// side-effects run before sibling imports execute their module-level code.

import { Buffer } from "buffer";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Buffer: typeof Buffer; global: any; process: any; }
}

if (typeof window !== "undefined") {
  if (!window.Buffer) window.Buffer = Buffer;
  if (!window.global) window.global = window;
  if (!window.process) window.process = { env: {} };
}

// Also expose on globalThis for non-browser code that runs during SSR / tests.
const g = globalThis as unknown as {
  Buffer?: typeof Buffer;
  process?: { env: Record<string, string> };
};
if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = { env: {} };

export {};
