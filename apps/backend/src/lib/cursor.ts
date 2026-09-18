export interface DateCreatedAtCursor {
  date: string;
  created_at: string;
}

export function encodeCursor(cursor: DateCreatedAtCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string | undefined): DateCreatedAtCursor | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
