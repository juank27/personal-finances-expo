import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";

import { storage } from "@/lib/storage";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

// NativeWind's setColorScheme only lives in memory — this hook persists the user's
// manual override so it survives an app restart, defaulting to "system" (today's behavior)
// when nothing has been saved yet.
export function useThemePreference() {
  const { setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    storage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled || !isThemePreference(stored)) return;
      setPreferenceState(stored);
      setColorScheme(stored);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    setColorScheme(next);
    storage.setItem(STORAGE_KEY, next);
  }

  return { preference, setPreference };
}
