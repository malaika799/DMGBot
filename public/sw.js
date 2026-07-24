// public/sw.js
//
// Minimal Web Push service worker for DMG Bot.
// This is what lets a notification pop up on the laptop even when the app
// tab / browser window is fully closed — the browser itself wakes this
// worker up when the backend's push server sends a message, there is no
// need for the app to be open.
//
// NOTE: this only works if the backend also implements the *sending* side
// (storing subscriptions from src/lib/push.js and pushing messages to them
// using a library like `web-push` with the matching VAPID key pair). See
// src/lib/push.js for the frontend half of this feature.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fired when the push service delivers a message from the backend.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "DMG Bot", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "DMG Bot";
  const options = {
    body: data.body || "You have a new notification.",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    data: { url: data.url || "/dashboard" },
    tag: data.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Fired when the user clicks the notification — focus an existing tab if
// one is open, otherwise open a new one at the relevant page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        clientList[0].navigate(targetUrl);
        return clientList[0].focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
