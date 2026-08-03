# Push bildirishnomalar (FCM) — sozlash

Push bildirishnomalar **Firebase Cloud Messaging** orqali:
- Agent APK (`uz.distributor.crm`)
- Mijoz APK (`uz.lider.client`)
- Admin panel (brauzer web push)

## 1. Firebase loyiha yaratish

1. [Firebase Console](https://console.firebase.google.com/) ga kiring
2. **Add project** → masalan `lider-navoiy`
3. Google Analytics ixtiyoriy

## 2. Android ilovalar

### Agent
1. **Add app** → Android
2. Package: `uz.distributor.crm`
3. `google-services.json` → `android-app/app/google-services.json`

### Mijoz
1. **Add app** → Android (xuddi shu loyihaga)
2. Package: `uz.lider.client`
3. `google-services.json` → `client-android-app/app/google-services.json`

> Har bir app uchun Firebase dan yuklab olingan haqiqiy fayl bilan placeholder ni almashtiring.

## 3. Web (Admin panel)

1. Firebase → **Add app** → Web
2. Config qiymatlarini oling
3. **Project Settings → Cloud Messaging → Web Push certificates** → **Generate key pair** (VAPID)

Lokal / production `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=lider-navoiy.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lider-navoiy
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...
VITE_FIREBASE_VAPID_KEY=...
```

Admin login qilganda brauzer bildirishnoma ruxsatini so‘raydi va FCM token serverga yuboriladi.

## 4. Backend (Service Account)

1. Firebase → **Project Settings** → **Service accounts**
2. **Generate new private key**
3. Backend `.env` (serverda `.env.production`):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 5. Ishlash tartibi

| Qadam | Kim | Nima |
|-------|-----|------|
| Login | Agent / Mijoz APK | FCM token → `POST /notifications/fcm-token` |
| Login | Admin (brauzer) | Web push token → xuddi shu endpoint |
| Broadcast | Admin → Push bo‘limi | Agentlar / mijozlar / adminlar / hammaga |
| Tarix | Har bir user | `GET /notifications` |

## 6. API

| Method | URL | Kim |
|--------|-----|-----|
| POST | `/notifications/fcm-token` | Har qanday login qilgan user |
| GET | `/notifications` | O‘z tarixi |
| POST | `/notifications/broadcast` | Admin — `audience`: `agents` \| `clients` \| `admins` \| `all` |
| POST | `/notifications/send` | Admin — bitta userga |

## 7. Tekshirish

1. Firebase kalitlarini qo‘ying (Android + backend + admin panel)
2. Agent va mijoz APK ni qayta build qiling
3. Login qiling, bildirishnoma ruxsatini bering
4. Admin → **Push** → auditoriyani tanlab test yuboring

## Muammolar

| Muammo | Yechim |
|--------|--------|
| `FIREBASE_NOT_CONFIGURED` | Backend `FIREBASE_*` env to‘liq emas |
| Push kelmayapti | `google-services.json` package name mosligi |
| Admin brauzerda yo‘q | `VITE_FIREBASE_*` + VAPID + HTTPS |
| Token yo‘q | Login + internet + notification permission |
| Emulator | Google Play Services kerak |
