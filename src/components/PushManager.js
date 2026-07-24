"use client";

import { useEffect } from "react";
import { isPushSupported, registerServiceWorker } from "@/lib/push";

/**
 * Mounted once in the root layout, next to ThemeManager.
 *
 * This does NOT ask for notification permission on its own — that only
 * happens when the user flips "Push Notifications" on in Settings. All this
 * does is make sure the service worker (public/sw.js) is registered on
 * every visit, so a subscription created in a previous session keeps
 * working and the browser can still wake it up to show a notification even
 * when this tab/app isn't open.
 */
export default function PushManager() {
  useEffect(() => {
    if (isPushSupported() && Notification.permission === "granted") {
      registerServiceWorker().catch(() => {});
    }
  }, []);

  return null;
}
