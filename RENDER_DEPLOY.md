# Render backend deploy

Bir marta bosing (GitHub bilan login bo'lishi kerak):

**https://dashboard.render.com/blueprints/new?repo=https%3A%2F%2Fgithub.com%2FJavlonrasulov%2FLiderNavoiy**

Yoki: [Deploy to Render](https://render.com/deploy?repo=https://github.com/Javlonrasulov/LiderNavoiy)

## Nima yaratiladi

- `lider-navoiy-api` — NestJS API → `https://lider-navoiy-api.onrender.com`
- `lider-navoiy-db` — Postgres (free, 30 kun)
- `lider-navoiy-redis` — Redis / Key Value (free)

## Deploy dan keyin Netlify

```bash
netlify env:set VITE_API_URL "https://lider-navoiy-api.onrender.com/api/v1" --context production
netlify env:set VITE_WS_URL "https://lider-navoiy-api.onrender.com" --context production
netlify env:set VITE_UPLOADS_URL "https://lider-navoiy-api.onrender.com" --context production
```

Keyin Netlifyda **Trigger deploy** (clear cache).

Login: `admin` / `admin123`

## Eslatma

Free Render API ~15 daqiqa traffic bo'lmasa "uxlaydi", birinchi ochilish ~1 daqiqa olishi mumkin.
