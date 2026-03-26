# API Service

REST API for the platform, built with Node.js and Express.

## Setup

```bash
cd services/api
npm install
npm run dev
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
