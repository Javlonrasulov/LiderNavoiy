 # Distributor CRM — Android App

Native Android agent app: Kotlin + Jetpack Compose + MVVM + Hilt.

## Architecture

```
app/src/main/java/uz/distributor/crm/
├── data/
│   ├── local/          Room (offline GPS queue)
│   ├── remote/         Retrofit API
│   └── repository/     Repository pattern
├── domain/model/       Domain models
├── presentation/       Compose UI + ViewModels
├── service/            Foreground GPS + WorkManager sync
└── di/                 Hilt modules
```

## Requirements

- Android Studio Ladybug or newer
- JDK 17
- Yandex MapKit API key
- Backend running (see `../backend/README.md`)

## Setup

1. Open `android-app/` in Android Studio
2. Set Yandex MapKit key in `app/build.gradle.kts`:
   ```kotlin
   buildConfigField("String", "MAPKIT_API_KEY", "\"your-key-here\"")
   ```
3. For emulator, API URL is `http://10.0.2.2:3000/api/v1/` (default)
4. For **real phone**, copy `local.properties.example` to `local.properties` and set your PC LAN IP:
   ```
   api.host=192.168.1.100
   ```
   Then rebuild APK. Phone and PC must be on the same Wi‑Fi; backend must listen on `0.0.0.0:3000`.

## Build APK

```bash
cd android-app
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## Features implemented

- [x] JWT Login
- [x] Dashboard UI (Figma design)
- [x] Bottom navigation
- [x] Foreground GPS tracking (5 sec interval)
- [x] Background location service
- [x] Room offline queue
- [x] WorkManager batch sync
- [x] Boot receiver (auto-start tracking)
- [ ] Yandex MapKit map screen
- [ ] Clients list screen
- [ ] Visit / order flow
- [ ] FCM push notifications
- [ ] Socket.IO real-time

## GPS behavior

| Scenario | Behavior |
|----------|----------|
| Online | Send location every 5s via REST |
| Offline | Save to Room, sync via WorkManager |
| App closed | Foreground service continues |
| Boot | BootReceiver restarts service |

## Test credentials

```
Username: agent001
Password: agent123
```
