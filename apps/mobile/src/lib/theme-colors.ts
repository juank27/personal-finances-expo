// SVG/native-only color needs (e.g. gifted-charts' innerCircleColor, RN Switch trackColor)
// can't consume the CSS variables from global.css — those only resolve through NativeWind's
// className processing. Keep these few raw hex values in sync with global.css by hand.
export const THEME_COLORS = {
  light: { card: "#FFFFFF", track: "#E5E7EB" },
  dark: { card: "#1C1C21", track: "#3F3F46" },
} as const;

export type ThemeColorScheme = keyof typeof THEME_COLORS;
