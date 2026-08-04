import type { Category } from "@finanzas/shared";
import type { CreateCategoryInput, UpdateCategoryInput } from "@finanzas/validators";
import { sql } from "../../db";
import { HttpError } from "../../middleware/error-handler";

export async function listCategories(userId: string): Promise<Category[]> {
  return sql<Category[]>`
    SELECT * FROM categories
    WHERE archived_at IS NULL
      AND (user_id IS NULL OR user_id = ${userId})
    ORDER BY type, name
  `;
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<Category> {
  const [category] = await sql<Category[]>`
    INSERT INTO categories (user_id, name, icon, type, is_default)
    VALUES (${userId}, ${input.name}, ${input.icon}, ${input.type}, false)
    RETURNING *
  `;
  return category;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<Category> {
  const archivedAt = input.archived === undefined ? undefined : input.archived ? sql`now()` : null;

  const [category] = await sql<Category[]>`
    UPDATE categories
    SET
      name = COALESCE(${input.name ?? null}, name),
      icon = COALESCE(${input.icon ?? null}, icon),
      archived_at = ${archivedAt === undefined ? sql`archived_at` : archivedAt}
    WHERE id = ${categoryId} AND user_id = ${userId}
    RETURNING *
  `;

  if (!category) {
    throw new HttpError(404, "Category not found", "not_found");
  }

  return category;
}
