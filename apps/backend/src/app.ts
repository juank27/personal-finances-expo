import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { budgetsRouter } from "./modules/budgets/budgets.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { transactionsRouter } from "./modules/transactions/transactions.routes";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

app.use("/categories", categoriesRouter);
app.use("/transactions", transactionsRouter);
app.use("/budgets", budgetsRouter);

app.use(errorHandler);
