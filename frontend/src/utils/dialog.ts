// Cross-platform confirm and notify.
// On web, react-native's Alert.alert is a no-op for destructive callbacks,
// so we fall back to window.confirm / window.alert.

import { Alert, Platform } from "react-native";

export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok =
      typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm(message ? `${title}\n\n${message}` : title)
        : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Remove", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
