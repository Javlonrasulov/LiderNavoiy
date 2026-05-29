# Distributor CRM — Backend API

NestJS + PostgreSQL (PostGIS) + Redis + WebSocket backend for the Distributor CRM system.

## Quick Start

```bash
cd backend
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run start:dev
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/docs`

## Seed test agent

```bash
npx ts-node scripts/seed.ts
# Login: agent001 / agent123
```

## Docker (full stack)

```bash
docker compose up -d
```

## Modules

| Module | Endpoint prefix | Description |
|--------|----------------|-------------|
| Auth | `/auth` | JWT login, refresh, logout |
| Distributors | `/distributors` | Agent management, online status |
| GPS | `/gps` | Location ingest, batch sync, PostGIS nearby |
| Routes | `/routes` | Daily/weekly route history + stats |
| Visits | `/visits` | Client visit tracking + offline sync |
| Orders | `/orders` | Order creation + offline sync |
| Clients | `/clients` | Client list and search |
| Notifications | `/notifications` | FCM token registration |
| Tracking (WS) | `/tracking` | Real-time location WebSocket |

## WebSocket

Connect to `ws://localhost:3000/tracking` with auth token:

```javascript
const socket = io('http://localhost:3000/tracking', {
  auth: { token: accessToken }
});
socket.on('location:live', (data) => console.log(data));
```

## PostGIS queries

- `GET /gps/nearby-clients?latitude=40.1&longitude=65.3&radiusMeters=500`
- Geofencing and route analysis via `routes/:id/daily` and `routes/:id/weekly`

## Environment

See `.env.example` for all variables.
