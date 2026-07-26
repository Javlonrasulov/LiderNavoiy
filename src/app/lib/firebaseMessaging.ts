import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { api } from '../api/client';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

function isConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey &&
    !String(firebaseConfig.apiKey).includes('REPLACE')
  );
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getApp(): FirebaseApp | null {
  if (!isConfigured()) return null;
  if (app) return app;
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  if (!messaging) messaging = getMessaging(firebaseApp);
  return messaging;
}

/** Admin panel login dan keyin FCM web tokenni serverga yuboradi */
export async function registerAdminWebPush(): Promise<boolean> {
  if (!isConfigured()) {
    console.info('[FCM] Admin web push sozlanmagan (VITE_FIREBASE_* env)');
    return false;
  }
  if (!localStorage.getItem('api_access_token')) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const msg = await getMessagingInstance();
    if (!msg) return false;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return false;

    await api.registerFcmToken(token);
    console.info('[FCM] Admin web token registered');
    return true;
  } catch (err) {
    console.warn('[FCM] registerAdminWebPush failed', err);
    return false;
  }
}

export function isAdminWebPushConfigured() {
  return isConfigured();
}
