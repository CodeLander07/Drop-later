import 'dotenv/config';
import express from 'express';
import IORedis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'sink' });
const app = express();
app.use(express.json());

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new IORedis(redisUrl);
const port = parseInt(process.env.SINK_PORT || process.env.PORT || '4000', 10);
const shouldFail = (process.env.SINK_FAIL || 'false').toLowerCase() === 'true';

app.post('/sink', async (req, res) => {
  if (shouldFail) {
    return res.status(500).json({ error: 'Sink configured to fail' });
  }
  const key = req.get('X-Idempotency-Key');
  if (!key) return res.status(400).json({ error: 'Missing X-Idempotency-Key' });
  const set = await redis.setnx(`sink:idem:${key}`, '1');
  if (set === 0) {
    return res.json({ ok: true, duplicate: true });
  }
  await redis.expire(`sink:idem:${key}`, 86400);
  logger.info({ body: req.body, headers: req.headers }, 'sink received');
  res.json({ ok: true });
});

app.listen(port, () => logger.info({ port }, 'Sink listening'));


