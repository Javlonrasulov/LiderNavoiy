# Distributor CRM — To'liq Loyiha

## Tuzilma

```
Lider Navoiy/
├── src/                    Admin Panel (React + Vite) — faqat admin
├── src/app/api/client.ts   Admin ↔ Backend API ulanish
├── backend/                NestJS API — TAYYOR
├── android-app/            Kotlin Android Agent — TAYYOR
```

---

## 1. Backend ishga tushirish

```powershell
cd backend
copy .env.example .env
docker compose up -d postgres redis
npm install
npm run start:dev
```

Boshqa terminalda seed:
```powershell
cd backend
npx ts-node scripts/seed.ts
```

| URL | Ma'nosi |
|-----|---------|
| http://localhost:3000/api/v1 | REST API |
| http://localhost:3000/docs | Swagger |
| ws://localhost:3000/tracking | WebSocket GPS |

**Login:**
- Admin: `admin` / `admin123`
- Agent: `agent001` / `agent123`

---

## 2. Admin Panel ishga tushirish

```powershell
copy .env.example .env
npm install
npm run dev
```

Admin: http://localhost:5173/admin

---

## 3. Android APK yig'ish

1. Android Studio'da `android-app/` oching
2. `app/build.gradle.kts` da API URL ni sozlang (xarita — OpenStreetMap, kalit shart emas)
3. Run yoki: `./gradlew assembleDebug`

Emulator uchun API: `http://10.0.2.2:3000/api/v1`
Real telefon uchun: kompyuter IP manzili

---

## Backend modullar

| Modul | Endpoint |
|-------|----------|
| Auth | POST /auth/login, /auth/refresh |
| Dashboard | GET /dashboard/stats |
| GPS | POST /gps/location, /gps/location/batch |
| Routes | GET /routes/:id/daily, /weekly |
| Distributors | GET /distributors, /distributors/online |
| Clients | GET /clients, /clients/search |
| Products | GET /products, /products/categories |
| Visits | POST /visits, POST /visits/sync |
| Orders | POST /orders, POST /orders/sync |
| Notifications | POST /notifications/fcm-token |
| WebSocket | /tracking — real-time lokatsiya |

---

## Android ekranlar

| Ekran | Holat |
|-------|-------|
| Login | ✅ |
| Dashboard (Figma dizayn) | ✅ |
| Klientlar ro'yxati | ✅ |
| Klient tafsiloti | ✅ |
| Vizit / Mahsulotlar | ✅ |
| Buyurtma tasdiqlash | ✅ |
| Lokatsiya / Xarita | ✅ |
| Plan | ✅ |
| Xabarlar | ✅ |
| Profil | ✅ |
| GPS Foreground Service (5 sek) | ✅ |
| Room offline saqlash | ✅ |
| WorkManager sinxronizatsiya | ✅ |

---

## GPS oqimi

```
Android GPS (har 5 sek)
  → Foreground Service (background)
  → Online: REST POST /gps/location
  → Offline: Room Database
  → WorkManager: batch sync
  → PostgreSQL + PostGIS
  → WebSocket → Admin Panel xarita
```

---

## Production deploy (Docker)

```powershell
cd backend
docker compose up -d
```

Nginx: port 80 → API + WebSocket proxy
