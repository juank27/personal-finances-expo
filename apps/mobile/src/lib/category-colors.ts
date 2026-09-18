// Validated for both CVD (color-vision-deficiency) separation and normal-vision contrast
// against this app's light/dark surfaces — the previous single-mode palette had two hues
// (orange/amber) that were nearly indistinguishable from each other in either mode.
const CATEGORY_ACCENT_COLORS_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
] as const;

const CATEGORY_ACCENT_COLORS_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
] as const;

// Hashes the stable category id (not the name, which can be renamed) to a fixed accent
// color, picked from the palette matching the current color scheme.
export function getCategoryColor(categoryId: string, scheme: "light" | "dark" = "light"): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  const palette = scheme === "dark" ? CATEGORY_ACCENT_COLORS_DARK : CATEGORY_ACCENT_COLORS_LIGHT;
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}
