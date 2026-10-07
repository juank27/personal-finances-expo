import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
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
