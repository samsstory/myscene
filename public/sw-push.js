// Push notification handler — injected alongside VitePWA's service worker

self.addEventListener('push', (event) => {
  let data = { title: 'SCENE', body: 'You have a new notification' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // fallback to text
    if (event.data) {
      data = { title: 'SCENE', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: '/images/pwa-192.png',
    badge: '/images/pwa-192.png',
    data: {
      url: data.url || '/',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SCENE', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

