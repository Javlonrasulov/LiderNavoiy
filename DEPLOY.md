# VPS deploy

Site: https://lider-navoiy.uz  
Server path: `/opt/lider-navoiy/backend`

```bash
cd /opt/lider-navoiy/backend
sudo docker compose --env-file .env.production up -d --build
```

Parollar: serverdagi `/opt/lider-navoiy/credentials.txt` (faqat root/ubuntu)
