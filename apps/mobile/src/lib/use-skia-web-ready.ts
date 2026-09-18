import { useEffect, useState } from "react";
import { Platform } from "react-native";

// Native platforms link Skia as a native module — nothing to wait for. Web needs the
// CanvasKit WASM binary (public/canvaskit.wasm, copied by `npx setup-skia-web`) fetched
// and initialized before any component renders a Skia canvas (victory-native's PolarChart),
// or it throws trying to read `global.CanvasKit`.
export function useSkiaWebReady(): boolean {
  const [ready, setReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let cancelled = false;
    import("@shopify/react-native-skia/lib/module/web").then(({ LoadSkiaWeb }) =>
      LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
        if (!cancelled) setReady(true);
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
