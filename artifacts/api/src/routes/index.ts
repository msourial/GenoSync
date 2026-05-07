import { Router, type IRouter } from "express";
import healthRouter from "./health";
import receiptsRouter from "./receipts";
import authRouter from "./auth";
import worldIdRouter from "./world-id";
import filecoinRouter from "./filecoin";
import auraRouter from "./aura";
import bioRouter from "./bio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(receiptsRouter);
router.use(authRouter);
router.use(worldIdRouter);
router.use(filecoinRouter);
router.use(auraRouter);
router.use(bioRouter);

export default router;
