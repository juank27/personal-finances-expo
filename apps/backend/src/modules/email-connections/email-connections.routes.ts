import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import {
  disconnectEmailConnection,
  getEmailConnection,
  handleGoogleCallback,
  startGoogleConnection,
} from "./email-connections.service";

export const emailConnectionsRouter = Router();

// Google redirects here directly — it can't carry our bearer token, and the request is
// authenticated instead via the signed `state` param (see oauth-state.ts).
emailConnectionsRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const { status } = await handleGoogleCallback(
      req.query.code as string | undefined,
      req.query.state as string | undefined
    );
    res.redirect(302, `mobile://email-sync-callback?status=${status}`);
  })
);

emailConnectionsRouter.use(requireAuth);

emailConnectionsRouter.post(
  "/google/start",
  asyncHandler(async (req, res) => {
    const data = startGoogleConnection(req.userId);
    res.json({ data });
  })
);

emailConnectionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getEmailConnection(req.userId);
    res.json({ data });
  })
);

emailConnectionsRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await disconnectEmailConnection(req.userId);
    res.status(204).send();
  })
);
