export const CATEGORY_ACCENT_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#D97706", // amber (darker than 500 so a white icon stays readable)
  "#10B981", // emerald
  "#0EA5E9", // sky
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
] as const;

// Hashes the stable category id (not the name, which can be renamed) to a fixed accent
// color. Same value in light and dark mode — a saturated color reads fine on either.
export function getCategoryColor(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % CATEGORY_ACCENT_COLORS.length;
  return CATEGORY_ACCENT_COLORS[index];
}
