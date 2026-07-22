import { Router } from "express";
import { createCategorySchema, updateCategorySchema } from "@finanzas/validators";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { createCategory, listCategories, updateCategory } from "./categories.service";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await listCategories(req.userId);
    res.json({ data: categories });
  })
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const category = await createCategory(req.userId, input);
    res.status(201).json({ data: category });
  })
);

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateCategorySchema.parse(req.body);
    const category = await updateCategory(req.userId, req.params.id, input);
    res.json({ data: category });
  })
);
