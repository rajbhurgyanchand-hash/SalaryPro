// ============================================================
//  SalaryPro Service Worker — PWA + Advanced Notifications
// ============================================================

const CACHE_NAME = 'salarypro-v1';
const ASSETS = ['./index.html', './SalaryPro.html', './manifest.json', './icon-192.png', './icon-512.png'];

// ── Install: cache core assets ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fallback to network ────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push Notification handler ────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const options = {
    body: data.body || 'SalaryPro notification',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'salarypro',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || './SalaryPro.html', ...data },
    actions: data.actions || []
  };
  e.waitUntil(self.registration.showNotification(data.title || 'SalaryPro', options));
});

// ── Notification click handler ───────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './SalaryPro.html';
  if (e.action === 'mark') {
    e.waitUntil(clients.openWindow('./SalaryPro.html#calendar'));
  } else if (e.action === 'dismiss') {
    // just close
  } else {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const client of list) {
          if (client.url.includes('SalaryPro') && 'focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      })
    );
  }
});

// ── Background Sync (for scheduled reminders) ───────────────
self.addEventListener('sync', e => {
  if (e.tag === 'attendance-reminder') {
    e.waitUntil(sendAttendanceReminder());
  }
});

// ── Periodic Background Sync ─────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-reminder') {
    e.waitUntil(sendDailyReminder());
  }
});

async function sendAttendanceReminder() {
  await self.registration.showNotification('⏰ Attendance Reminder', {
    body: "Don't forget to mark today's attendance in SalaryPro!",
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [300, 100, 300],
    tag: 'attendance-reminder',
    renotify: true,
    actions: [
      { action: 'mark', title: '✅ Mark Now' },
      { action: 'dismiss', title: '❌ Dismiss' }
    ],
    data: { url: './SalaryPro.html#calendar' }
  });
}

async function sendDailyReminder() {
  await self.registration.showNotification('📊 Daily Salary Update', {
    body: 'Check your earned salary and attendance for today.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'daily-reminder',
    renotify: true,
    data: { url: './SalaryPro.html#dashboard' }
  });
}

// ── Message handler (from main app) ─────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, vibrate, actions, requireInteraction, url } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: vibrate || [200, 100, 200],
      tag: tag || 'salarypro-msg',
      renotify: true,
      requireInteraction: requireInteraction || false,
      actions: actions || [],
      data: { url: url || './SalaryPro.html' }
    });
  }
});
