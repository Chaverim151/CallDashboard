// Hatzolah MC — Service Worker (FCM version)
// Place at: chaverim151.github.io/CallDashboard/sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDFWxlw9aLIn9HB2L_B6vbhvY5-nlXhpHM",
  authDomain: "hvac-ops.firebaseapp.com",
  projectId: "hvac-ops",
  storageBucket: "hvac-ops.firebasestorage.app",
  messagingSenderId: "636260762798",
  appId: "1:636260762798:web:2ae24d5c15f3aeb315993f"
});

var messaging = firebase.messaging();

// ── BACKGROUND PUSH — app is closed or tab not focused ──
// Cloud Function sends this when a new call is created
messaging.onBackgroundMessage(function(payload) {
  var data = payload.data || {};
  var title = data.title || 'Hatzolah MC — New Call';
  var body  = data.body  || 'Tap to view';
  var callId = data.callId || '';

  // Signal any open windows to play the tone
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
    cls.forEach(function(c) { c.postMessage({ type: 'PLAY_TONE' }); });
  });

  return self.registration.showNotification(title, {
    body: body,
    icon: 'https://i.ibb.co/j40wTVT/hatzolah-middelessex-county-final-removebg-preview-1-20231129-233435-0000.png',
    badge: 'https://i.ibb.co/j40wTVT/hatzolah-middelessex-county-final-removebg-preview-1-20231129-233435-0000.png',
    tag: 'hatzolah-call',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    data: { callId: callId, url: 'https://chaverim151.github.io/CallDashboard/mobile.html' }
  });
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url)
    || 'https://chaverim151.github.io/CallDashboard/mobile.html';
  var callId = e.notification.data && e.notification.data.callId;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url.indexOf('chaverim151.github.io/CallDashboard') !== -1) {
          if (callId) cls[i].postMessage({ type: 'NEW_CALL', callId: callId });
          return cls[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── MESSAGES FROM APP ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'PLAY_TONE') {
    // Tone is played by the app window, nothing to do here
  }
});

// ── INSTALL / ACTIVATE ──
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });
