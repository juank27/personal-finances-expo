// SVG/native-only color needs (e.g. gifted-charts' innerCircleColor, RN Switch trackColor)
// can't consume the CSS variables from global.css — those only resolve through NativeWind's
// className processing. Keep these few raw hex values in sync with global.css by hand.
export const THEME_COLORS = {
  light: {
    card: "#FFFFFF",
    track: "#E5E7EB",
    foreground: "#1C1C22",
    background: "#FFFFFF",
    border: "#E5E7EB",
    tabBarActive: "#4F46E5",
    tabBarInactive: "#9CA3AF",
    primaryForeground: "#FFFFFF",
  },
  dark: {
    card: "#1C1C21",
    track: "#3F3F46",
    foreground: "#F5F5F5",
    background: "#141416",
    border: "#3F3F46",
    tabBarActive: "#818CF8",
    tabBarInactive: "#71717A",
    primaryForeground: "#141417",
  },
} as const;

export type ThemeColorScheme = keyof typeof THEME_COLORS;
