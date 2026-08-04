import { Router } from "express";
import { createBudgetSchema, updateBudgetSchema } from "@finanzas/validators";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { createBudget, deleteBudget, listBudgets, updateBudget } from "./budgets.service";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

budgetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const budgets = await listBudgets(req.userId);
    res.json({ data: budgets });
  })
);

budgetsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createBudgetSchema.parse(req.body);
    const budget = await createBudget(req.userId, input);
    res.status(201).json({ data: budget });
  })
);

budgetsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateBudgetSchema.parse(req.body);
    const budget = await updateBudget(req.userId, req.params.id, input);
    res.json({ data: budget });
  })
);

budgetsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteBudget(req.userId, req.params.id);
    res.status(204).send();
  })
);
