import { Router } from "express";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  paginationQuerySchema,
  updateTransactionSchema,
} from "@finanzas/validators";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "./transactions.service";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = listTransactionsQuerySchema.parse(req.query);
    const pagination = paginationQuerySchema.parse(req.query);
    const result = await listTransactions(req.userId, filters, pagination);
    res.json({ data: result });
  })
);

transactionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const transaction = await getTransaction(req.userId, req.params.id);
    res.json({ data: transaction });
  })
);

transactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTransactionSchema.parse(req.body);
    const transaction = await createTransaction(req.userId, input);
    res.status(201).json({ data: transaction });
  })
);

transactionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateTransactionSchema.parse(req.body);
    const transaction = await updateTransaction(req.userId, req.params.id, input);
    res.json({ data: transaction });
  })
);

transactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteTransaction(req.userId, req.params.id);
    res.status(204).send();
  })
);
