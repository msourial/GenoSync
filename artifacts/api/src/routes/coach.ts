import { Router, type IRouter, type Request, type Response } from "express";
import { coachReply, isBedrockMockMode, type CoachInput } from "../lib/bedrock";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * POST /api/coach
 * Body: { hrv?, strain?, apm?, postureWarning?, faceDetected?, message?, history? }
 * Returns Claude (on AWS Bedrock) wellness-coach reply.
 *
 * Set BEDROCK_MOCK=1 for local dev with no AWS credentials.
 */
router.post("/coach", async (req: Request, res: Response) => {
  try {
    const input = (req.body ?? {}) as CoachInput;
    const result = await coachReply(input);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "/coach failed");
    return res.status(500).json({ error: "coach unavailable" });
  }
});

router.get("/coach/status", (_req, res) => {
  res.json({
    provider: "aws-bedrock",
    region: process.env["AWS_REGION"] ?? "us-east-1",
    model: process.env["BEDROCK_MODEL_ID"] ?? "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    mocked: isBedrockMockMode(),
  });
});

export default router;
