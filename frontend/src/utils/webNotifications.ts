// Cross-platform web notifications (no-op on native).
import { Platform } from "react-native";

const SEEN_KEY = "mft_seen_alert_ids";

export type Permission = "default" | "granted" | "denied" | "unsupported";

function isWeb(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

export function getPermission(): Permission {
  if (!isWeb() || !("Notification" in window)) return "unsupported";
  return Notification.permission as Permission;
}

export async function requestNotificationPermission(): Promise<Permission> {
  if (!isWeb() || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission as Permission;
  }
  const res = await Notification.requestPermission();
  return res as Permission;
}

export function showNotification(title: string, body: string, onClick?: () => void) {
  if (!isWeb() || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: title });
    if (onClick) {
      n.onclick = () => {
        if (typeof window !== "undefined") window.focus();
        onClick();
      };
    }
  } catch {}
}

function loadSeen(): Set<string> {
  if (!isWeb()) return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  if (!isWeb()) return;
  try {
    // Keep last 200 ids only
    const arr = Array.from(set).slice(-200);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export function filterNewAlerts<T extends { id: string }>(alerts: T[]): T[] {
  const seen = loadSeen();
  const fresh = alerts.filter((a) => !seen.has(a.id));
  fresh.forEach((a) => seen.add(a.id));
  if (fresh.length > 0) saveSeen(seen);
  return fresh;
}

export function markAllSeen<T extends { id: string }>(alerts: T[]) {
  const seen = loadSeen();
  alerts.forEach((a) => seen.add(a.id));
  saveSeen(seen);
}
