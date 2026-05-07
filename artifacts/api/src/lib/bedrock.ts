import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { logger } from "./logger";

/**
 * AWS Bedrock — Claude wellness coach.
 *
 * The browser sends a wellness/biometric snapshot (already KMS-encrypted on the
 * way *in* — see /api/bio/encrypt). The coach route ingests the *decrypted*
 * payload only inside the request handler, never persists plaintext, and
 * forwards the prompt to Claude on Bedrock for an empathetic suggestion.
 *
 * Model defaults to anthropic.claude-3-5-sonnet (cross-region inference profile);
 * override with BEDROCK_MODEL_ID.
 */

const REGION = process.env["AWS_REGION"] ?? "us-east-1";
const MODEL_ID =
  process.env["BEDROCK_MODEL_ID"] ??
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0";

let cachedClient: BedrockRuntimeClient | null = null;
function getClient(): BedrockRuntimeClient {
  if (cachedClient) return cachedClient;
  cachedClient = new BedrockRuntimeClient({ region: REGION });
  return cachedClient;
}

const SYSTEM_PROMPT = `You are AURA, GenoSync's empathetic wellness coach.
You receive HRV, strain, posture, and APM signals from a user's wearable + camera.
Reply in 1–2 short sentences. Be specific to the metrics. Suggest one micro-action
the user can do in under a minute. Never give medical advice. Use a warm,
encouraging tone — never alarmist. Sign off with a single emoji at most.`;

export interface CoachInput {
  hrv?: number;
  strain?: number;
  apm?: number;
  postureWarning?: boolean;
  faceDetected?: boolean;
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface CoachReply {
  reply: string;
  model: string;
  region: string;
  mocked: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export function isBedrockMockMode(): boolean {
  return process.env["BEDROCK_MOCK"] === "1";
}

function mockReply(input: CoachInput): string {
  if (input.postureWarning) {
    return "I see your shoulders rolling forward — try pulling your chest up and rolling them back five times. You've got this.";
  }
  if (typeof input.hrv === "number" && input.hrv < 35) {
    return `HRV at ${input.hrv} ms is on the low side. One slow box-breath: inhale 4, hold 4, exhale 4, hold 4 — that's it.`;
  }
  if (typeof input.strain === "number" && input.strain > 14) {
    return `Strain ${input.strain.toFixed(1)} is climbing. Stand up and roll your wrists out for thirty seconds — small reset, big payoff.`;
  }
  if (typeof input.apm === "number" && input.apm > 80) {
    return `Lots of input — ${Math.round(input.apm)} APM. Pause, drop your hands, take one slow breath before the next task.`;
  }
  return "You're holding a steady rhythm. Keep going — I'll flag anything that drifts.";
}

export async function coachReply(input: CoachInput): Promise<CoachReply> {
  if (isBedrockMockMode()) {
    return {
      reply: mockReply(input),
      model: MODEL_ID,
      region: REGION,
      mocked: true,
    };
  }

  const client = getClient();
  const userMessage = JSON.stringify({
    hrv: input.hrv,
    strain: input.strain,
    apm: input.apm,
    postureWarning: input.postureWarning,
    faceDetected: input.faceDetected,
    userMessage: input.message,
  });

  const messages = [
    ...(input.history ?? []).map((m) => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    })),
    { role: "user", content: [{ type: "text", text: userMessage }] },
  ];

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages,
  };

  try {
    const resp = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
      }),
    );

    const decoded = JSON.parse(new TextDecoder().decode(resp.body));
    const text =
      decoded?.content?.[0]?.text ??
      decoded?.completion ??
      "Coach offline — try again.";
    return {
      reply: String(text).trim(),
      model: MODEL_ID,
      region: REGION,
      mocked: false,
      inputTokens: decoded?.usage?.input_tokens,
      outputTokens: decoded?.usage?.output_tokens,
    };
  } catch (err) {
    logger.error({ err }, "[Bedrock] InvokeModel failed");
    return {
      reply: mockReply(input),
      model: MODEL_ID,
      region: REGION,
      mocked: true,
    };
  }
}
