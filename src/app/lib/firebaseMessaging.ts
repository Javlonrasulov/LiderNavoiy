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
/** Parallel chaqiriqlarni bitta so‘rovga birlashtirish (login + auth effect) */
let inFlight: Promise<boolean> | null = null;

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

type RegisterOptions = {
  /** true — faqat permission === 'default' bo‘lsa dialog ochadi; false — faqat allaqachon granted bo‘lsa token yuboradi */
  requestIfNeeded?: boolean;
};

/**
 * Admin panel: FCM web tokenni serverga yuboradi.
 * Sahifa yangilanganda dialog qayta ochilmasin — faqat login da requestIfNeeded=true.
 */
export async function registerAdminWebPush(options: RegisterOptions = {}): Promise<boolean> {
  const { requestIfNeeded = false } = options;
  if (!isConfigured()) {
    console.info('[FCM] Admin web push sozlanmagan (VITE_FIREBASE_* env)');
    return false;
  }
  if (!localStorage.getItem('api_access_token')) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      let permission = Notification.permission;

      if (permission === 'denied') return false;

      if (permission === 'default') {
        if (!requestIfNeeded) return false;
        permission = await Notification.requestPermission();
      }

      // Allaqachon granted — dialog ochilmaydi
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
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function isAdminWebPushConfigured() {
  return isConfigured();
}
