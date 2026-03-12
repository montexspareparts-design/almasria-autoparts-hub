// Push notification event handlers for the service worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "المصرية جروب", body: event.data.text() };
  }

  const isOrder = data.tag === "order" || (data.title && data.title.includes("طلب"));
  const isUrgent = data.tag === "urgent" || data.priority === "high";

  const options = {
    body: data.body || "",
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    // Strong vibration pattern: long-short-long-short-long
    vibrate: isUrgent || isOrder
      ? [300, 100, 300, 100, 400, 200, 300]
      : [200, 100, 200, 100, 200],
    dir: "rtl",
    lang: "ar",
    tag: data.tag || "masria-" + Date.now(),
    renotify: true,
    // Keep notification on screen until user interacts
    requireInteraction: true,
    // Do NOT set silent — let the OS play the default notification sound
    silent: false,
    data: {
      url: data.url || "/",
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      { action: "open", title: "فتح" },
      { action: "dismiss", title: "إغلاق" },
    ],
    // Timestamp for notification ordering
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "المصرية جروب", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
  );
});
