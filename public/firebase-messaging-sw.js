/* Firebase Cloud Messaging — admin panel service worker
 * Config quyida placeholder; Vite build emas, static fayl.
 * Haqiqiy qiymatlarni Firebase Console dan qo'ying yoki deploy oldidan yangilang.
 */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY || 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: self.__FIREBASE_AUTH_DOMAIN || 'REPLACE.firebaseapp.com',
  projectId: self.__FIREBASE_PROJECT_ID || 'REPLACE_WITH_YOUR_PROJECT_ID',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: self.__FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Lider Navoiy';
  const body = payload.notification?.body || payload.data?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload.data || {},
  });
});
