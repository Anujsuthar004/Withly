self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Withly", body: event.data.text(), url: "/inbox" };
  }

  const title = payload.title ?? "Withly";
  const options = {
    body: payload.body ?? "",
    icon: "/withly-app-icon.svg",
    badge: "/withly-app-icon.svg",
    data: { url: payload.url ?? "/inbox" },
    tag: payload.tag ?? "withly-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/inbox";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
