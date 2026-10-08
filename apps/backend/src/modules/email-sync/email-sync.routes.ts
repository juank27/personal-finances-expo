import { createEmailBackfillSchema } from "@finanzas/validators";
import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { getBackfillStatus, startBackfill } from "./email-backfill.service";
import { checkAndSync } from "./email-sync.service";

export const emailSyncRouter = Router();

emailSyncRouter.use(requireAuth);

emailSyncRouter.post(
  "/check",
  asyncHandler(async (req, res) => {
    const data = await checkAndSync(req.userId);
    res.json({ data });
  })
);

emailSyncRouter.post(
  "/backfill",
  asyncHandler(async (req, res) => {
    const input = createEmailBackfillSchema.parse(req.body);
    const data = await startBackfill(req.userId, input.from, input.to);
    res.json({ data });
  })
);

emailSyncRouter.get(
  "/backfill/:jobId",
  asyncHandler(async (req, res) => {
    const data = await getBackfillStatus(req.userId, req.params.jobId);
    res.json({ data });
  })
);
