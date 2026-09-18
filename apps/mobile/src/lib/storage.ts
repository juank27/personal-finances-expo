import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// SecureStore is a native module: unavailable on web (and during the Node-based
// static prerender), so it falls back to localStorage there.
export const storage: KeyValueStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) =>
          Promise.resolve(typeof localStorage === "undefined" ? null : localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage !== "undefined") localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };
