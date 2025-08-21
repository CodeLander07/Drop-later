Notes Delivery Service

Stack: Node.js + Express, MongoDB, Redis (BullMQ), tiny admin UI.

Run with Docker Compose

1. Create `.env` from `.env.example` and set `ADMIN_TOKEN`.
2. Run:

```
docker compose up --build
```

Services:
- API: http://localhost:3000
- Sink: http://localhost:4000
- Mongo: localhost:27017
- Redis: localhost:6379

Health:
```
curl http://localhost:3000/health
```

Example curl

Create note:
```
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Hello",
    "body":"Ship me later",
    "releaseAt":"2020-01-01T00:00:10.000Z",
    "webhookUrl":"http://localhost:4000/sink"
  }'
```

List:
```
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/notes?status=pending&page=1"
```

Replay:
```
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/notes/<id>/replay"
```

Env vars
See `.env.example` for all variables.

Tests
- Unit: idempotency key
- Integration: worker triggers sink once for past releaseAt (to be added)


