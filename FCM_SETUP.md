# Push bildirishnomalar (FCM) — sozlash

Push bildirishnomalar **majburiy** funksiya. Quyidagi qadamlarni bajaring.

## 1. Firebase loyiha yaratish

1. [Firebase Console](https://console.firebase.google.com/) ga kiring
2. **Add project** → loyiha nomi (masalan: `sherin-crm`)
3. Google Analytics ixtiyoriy

## 2. Android ilova qo'shish

1. Firebase loyihada **Add app** → **Android**
2. Package name: `uz.distributor.crm` (build.gradle dagi `applicationId` bilan bir xil)
3. **Register app**
4. `google-services.json` faylini yuklab oling
5. Faylni quyidagi joyga qo'ying:

```
android-app/app/google-services.json
```

> `google-services.json.example` namunasi bor — uni nusxalab, Firebase dan olingan haqiqiy fayl bilan almashtiring.

## 3. Backend uchun Service Account

1. Firebase Console → **Project Settings** → **Service accounts**
2. **Generate new private key** → JSON fayl yuklab olinadi
3. `backend/.env` fayliga qo'shing:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

JSON fayldan:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (bitta qator, `\n` bilan)

## 4. Ishlash tartibi

| Qadam | Kim | Nima bo'ladi |
|-------|-----|--------------|
| Login | Agent (Android) | FCM token serverga yuboriladi (`POST /notifications/fcm-token`) |
| Yangi buyurtma | Agent | Admin/menejerlarga avtomatik push |
| Broadcast | Admin panel | Barcha agentlarga push yuborish |
| Tarix | Agent | `GET /notifications` — Xabarlar ekranida |

## 5. API endpointlar

| Method | URL | Rol |
|--------|-----|-----|
| POST | `/notifications/fcm-token` | Agent — token ro'yxatdan o'tkazish |
| GET | `/notifications` | O'z bildirishnomalari |
| GET | `/notifications/unread-count` | O'qilmaganlar soni |
| POST | `/notifications/send` | Admin — bitta foydalanuvchiga |
| POST | `/notifications/broadcast` | Admin — barcha agentlarga |

## 6. Android ruxsatlar

Android 13+ da ilova birinchi marta ochilganda **Bildirishnomalar** ruxsati so'raladi. Rad etilsa, push ko'rinmaydi — Sozlamalar orqali yoqish kerak.

## 7. Tekshirish

1. Backend ishga tushiring: `cd backend && npm run start:dev`
2. Android ilovani qurib, telefonda oching
3. `agent001` / `agent123` bilan kiring
4. Admin paneldan **Push xabar** bo'limida test xabar yuboring
5. Yoki agent buyurtma yaratganda admin telefonida/panelida bildirishnoma kelishi kerak

## Muammolar

| Muammo | Yechim |
|--------|--------|
| Push kelmayapti | `google-services.json` to'g'ri joyda va package name mos kelishini tekshiring |
| Backend `FIREBASE_NOT_CONFIGURED` | `.env` da 3 ta Firebase o'zgaruvchi to'ldirilganini tekshiring |
| Token ro'yxatdan o'tmagan | Agent login qilganini va internet borligini tekshiring |
| Emulator | FCM emulatorda ham ishlaydi, lekin Google Play Services bo'lishi kerak |
