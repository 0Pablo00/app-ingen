// src/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAkc2zcnXo_Tx_qGUXvWV8NHZ7hEOsx6Fc",
  authDomain: "tareas-mfi.firebaseapp.com",
  projectId: "tareas-mfi",
  storageBucket: "tareas-mfi.appspot.com",
  messagingSenderId: "335156814976",
  appId: "1:335156814976:web:56176bc91a415cfa53b265"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting(); // Activar inmediatamente
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(clients.claim()); // Tomar control de las páginas
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido', event);
  if (!event.data) {
    console.log('[SW] Push sin datos');
    return;
  }
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[SW] Error parseando payload', e);
    return;
  }
  console.log('[SW] Payload:', payload);

  const title = payload.data?.title || payload.title || 'Tareas MFI';
  const options = {
    body: payload.data?.body || payload.body || 'Nueva notificación',
    icon: '/assets/icons/icon-192.webp',
    badge: '/assets/icons/badge.png',
    vibrate: [200, 100, 200],
    data: payload.data || payload   // Aquí incluimos taskId, orderNumber, etc.
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ✅ NUEVO: Manejar el clic en la notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada', event);
  event.notification.close();

  // Obtener el taskId de los datos de la notificación
  const taskId = event.notification.data?.taskId;
  let urlToOpen = 'https://tareas-mfi.web.app/tabs/home';
  if (taskId) {
    urlToOpen += `?taskId=${taskId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Buscar si ya hay una pestaña/ventana con la URL exacta
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no existe, abrir una nueva ventana
      return clients.openWindow(urlToOpen);
    })
  );
});