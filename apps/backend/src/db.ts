import postgres from "postgres";
import { config } from "./config";

// No camelCase transform: row shapes stay snake_case to match the DB columns
// and the @finanzas/shared types 1:1.
//
// `date` columns (oid 1082) come back from the wire as "YYYY-MM-DD" text; postgres.js's
// built-in `date` type handler wraps that in `new Date(...)`, which res.json() then
// serializes as a full ISO timestamp ("...T00:00:00.000Z"). Overriding the parser for
// oid 1082 only keeps it a plain string, matching the `string` type already declared on
// Budget.start_date/end_date and Transaction.date in @finanzas/shared. This does NOT touch
// timestamp (1114) / timestamptz (1184) — e.g. profiles.created_at still parses as Date.
export const sql = postgres(config.DATABASE_URL, {
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: string) => x,
      parse: (x: string) => x,
    },
  },
});
