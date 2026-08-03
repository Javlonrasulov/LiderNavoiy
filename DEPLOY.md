# VPS deploy (Ahost)

Server: `89.39.95.41`  
Domain: `lider-navoiy.uz`  
Loyiha yo‘li: `/opt/lider-navoiy/backend`

```bash
cd /opt/lider-navoiy/backend
sudo docker compose --env-file .env.production up -d --build
```

Login: `admin` / `123456`  
Agent APK: `agent` / `123456`  
Mijoz APK: `mijoz` / `123456`

Admin panel: http://89.39.95.41  
(Domain DNS tayyor bo‘lgach: https://lider-navoiy.uz)
