import { Router } from "express";
import { updateProfileSchema } from "@finanzas/validators";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { getProfile, updateProfile } from "./profiles.service";

export const profilesRouter = Router();

profilesRouter.use(requireAuth);

profilesRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.userId);
    res.json({ data: profile });
  })
);

profilesRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const profile = await updateProfile(req.userId, input);
    res.json({ data: profile });
  })
);
