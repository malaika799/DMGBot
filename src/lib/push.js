// src/lib/push.js
//
// Frontend half of "real" browser push notifications — the kind that show
// up even when the laptop's browser is fully closed, not just an in-app
// bell icon.
//
// How it fits together:
//   1. This file registers public/sw.js (the service worker) and asks the
//      browser for a push subscription (this is what triggers the
//      "Allow notifications?" permission prompt).
//   2. That subscription is sent to the backend (PushController) and stored
//      against the logged-in user (PushSubscription table).
//   3. Whenever the backend wants to notify the user (ReminderSchedulerService),
//      it sends a push message to that subscription using the WebPush NuGet
//      library + the matching VAPID private key. The browser's push service
//      delivers it to sw.js, which shows the notification — this works even
//      if this Next.js app/tab isn't open at all.

import api from "./axios";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

// Requests permission (if needed), subscribes to push, and saves the
// subscription on the backend. Returns { ok, reason } so the caller (the
// Settings toggle) can show a clear message instead of failing silently.
export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { ok: false, reason: "not-supported" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  // The VAPID public key lives on the backend (appsettings.json), not baked
  // into the frontend build, so it can be rotated without a rebuild/deploy.
  let publicKey;
  try {
    const { data } = await api.get("/push/vapid-public-key");
    publicKey = data?.publicKey;
  } catch (err) {
    console.error("Could not fetch VAPID public key.", err);
  }
  if (!publicKey) {
    return { ok: false, reason: "no-vapid-key" };
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  try {
    await api.post("/push/subscribe", {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  } catch (err) {
    console.error("Could not save push subscription on the backend.", err);
    return { ok: false, reason: "backend-error" };
  }

  // Fire a confirmation push immediately so the user sees it's actually working.
  try {
    await api.post("/push/test");
  } catch (err) {
    // Non-fatal — the subscription itself already succeeded.
  }

  return { ok: true };
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: true };
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.delete("/push/unsubscribe", { data: { endpoint } }).catch(() => {});
    }
    return { ok: true };
  } catch (err) {
    console.error("Could not unsubscribe from push.", err);
    return { ok: false, reason: "error" };
  }
}
