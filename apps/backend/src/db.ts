import postgres from "postgres";
import { config } from "./config";

// No camelCase transform: row shapes stay snake_case to match the DB columns
// and the @finanzas/shared types 1:1.
export const sql = postgres(config.DATABASE_URL);
