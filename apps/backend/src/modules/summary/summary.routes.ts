import { Router } from "express";
import { monthQuerySchema } from "@finanzas/validators";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { getExpenseSummary } from "./summary.service";

export const summaryRouter = Router();

summaryRouter.use(requireAuth);

summaryRouter.get(
  "/expenses",
  asyncHandler(async (req, res) => {
    const { month } = monthQuerySchema.parse(req.query);
    const summary = await getExpenseSummary(req.userId, month);
    res.json({ data: summary });
  })
);
