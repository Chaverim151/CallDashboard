// Hatzolah MC — Service Worker (Blaze / FCM version)
// Place this file at: chaverim151.github.io/CallDashboard/sw.js

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
messaging.onBackgroundMessage(function(payload) {
  var data = payload.data || {};
  var title = data.title || 'Hatzolah MC — New Call';
  var body  = data.body  || 'Tap to view';
  var callId = data.callId || '';

  var options = {
    body: body,
    icon: 'https://i.ibb.co/j40wTVT/hatzolah-middelessex-county-final-removebg-preview-1-20231129-233435-0000.png',
    badge: 'https://i.ibb.co/j40wTVT/hatzolah-middelessex-county-final-removebg-preview-1-20231129-233435-0000.png',
    tag: 'hatzolah-call',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    data: { callId: callId, url: 'https://chaverim151.github.io/CallDashboard/' },
    // Android custom sound — place dispatch_tone.wav in repo root
    sound: 'dispatch_tone.wav'
  };

  // Signal any open app tabs to play the tone
  return clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function(cls) {
      cls.forEach(function(c) { c.postMessage({ type: 'PLAY_TONE' }); });
      return self.registration.showNotification(title, options);
    });
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || 'https://chaverim151.github.io/CallDashboard/';
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

// ── INSTALL / ACTIVATE ──
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });
