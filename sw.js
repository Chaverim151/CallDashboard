// Hatzolah MC — Service Worker (FCM push) — 5.20 / 12.62
// Place at: chaverim151.github.io/CallDashboard/sw.js
//
// Every push is shown by THIS file, whether or not the app is open (5.20). Before, only Firebase's handler ran:
// it shows a push only when no page of the site is on screen — otherwise it hands the push to the page, and the
// app did nothing with it. So "Test" in My Settings never showed anything, alerts that came in while the app was
// open were lost, and iPhones count each such push as "silent" and cancel the phone's push registration after 3.
// Our listener is added before Firebase's and stops it, so each push is shown exactly once.
var SW_VERSION = '5.20';
var APP_URL = 'https://chaverim151.github.io/CallDashboard/mobile.html';
var ICON = 'https://chaverim151.github.io/CallDashboard/hz-icon-192.png';

self.addEventListener('push', function(e) {
  e.stopImmediatePropagation();   // Firebase's own push handler (added further down) must not run as well
  var payload = {};
  try { payload = e.data ? e.data.json() : {}; }
  catch (err) { try { payload = { data: { body: e.data.text() } }; } catch (err2) { payload = {}; } }
  var data = payload.data || {}, n = payload.notification || {};
  var title = data.title || n.title || 'Hatzolah MC';
  var body = data.body || n.body || '';
  var tag = data.tag || 'hatzolah-update';
  var isNewCall = /^hatzolah-call(-|$)/.test(tag);
  var isCallNotif = /^hatzolah-(call|update|assigned|als|note)/.test(tag);
  var isTest = /\[TEST\]|TEST MODE|🧪/i.test(title + ' ' + body) || tag === 'hatzolah-test';
  var shown = self.registration.showNotification(title, {
    body: body,
    icon: ICON,
    badge: ICON,
    tag: tag,
    renotify: true,
    requireInteraction: isNewCall,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    data: { callId: data.callId || '', ticketId: data.ticketId || '', url: data.url || APP_URL }
  });
  var tone = !isCallNotif ? null : clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
    cls.forEach(function(c) { c.postMessage({ type: 'PLAY_TONE', isTest: isTest }); });
  });
  e.waitUntil(Promise.all([shown, tone]));
});

// ── NOTIFICATION CLICK: bring the open app forward (or open it) and go to what was tapped ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var d = e.notification.data || {};
  var url = d.url || APP_URL;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        var c = cls[i];
        if (c.url.indexOf('chaverim151.github.io/CallDashboard') === -1) continue;
        if (/\/(protocols|guide|loc)\.html/.test(c.url)) continue;   // other pages of the site, not the app
        if (d.callId) c.postMessage({ type: 'NEW_CALL', callId: d.callId });
        if (d.ticketId) c.postMessage({ type: 'OPEN_TICKET', ticketId: d.ticketId });
        return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── MESSAGES FROM APP ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'PLAY_TONE') {
    // Tone is played by the app window
  }
});

// ── INSTALL / ACTIVATE ──
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });

// Firebase stays loaded for its own upkeep of the push registration. If it can't load (no signal while the
// worker updates), pushes are still shown by the listener above.
try {
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
  firebase.messaging();
} catch (err) { /* see above */ }
