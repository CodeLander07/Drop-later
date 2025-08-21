import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import dayjs from 'dayjs';
import { connectMongo } from './mongo.js';
import { Note } from './models/note.js';
import { authMiddleware } from './middleware/auth.js';
import { noteCreateSchema } from './validation.js';

const logger = pino({ name: 'api' });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health first (no auth)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Security: bearer token and rate limit
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(authMiddleware);

// POST /api/notes - create note
app.post('/api/notes', async (req, res, next) => {
  try {
    const parse = noteCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parse.error.issues });
    }
    const { title, body, releaseAt, webhookUrl } = parse.data;
    const releaseDate = new Date(releaseAt);
    const note = await Note.create({
      title,
      body,
      releaseAt: releaseDate,
      webhookUrl,
      status: 'pending',
      attempts: [],
      deliveredAt: null,
    });
    res.status(201).json({ id: note._id.toString() });
  } catch (err) {
    next(err);
  }
});

// GET /api/notes?status=&page=
app.get('/api/notes', async (req, res, next) => {
  try {
    const status = req.query.status;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = 20;
    const filter = {};
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      Note.find(filter)
        .sort({ releaseAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter),
    ]);
    const mapped = items.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      status: n.status,
      releaseAt: n.releaseAt,
      webhookUrl: n.webhookUrl,
      deliveredAt: n.deliveredAt,
      lastAttempt: n.attempts?.length ? n.attempts[n.attempts.length - 1] : null,
    }));
    res.json({ page, total, items: mapped });
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:id/replay
app.post('/api/notes/:id/replay', async (req, res, next) => {
  try {
    const id = req.params.id;
    const note = await Note.findById(id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'failed' && note.status !== 'dead') {
      return res.status(400).json({ error: 'Only failed or dead notes can be replayed' });
    }
    note.status = 'pending';
    note.releaseAt = new Date();
    await note.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

const port = parseInt(process.env.PORT || '3000', 10);
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes';

await connectMongo(mongoUri, logger);

app.listen(port, () => {
  logger.info({ port }, 'API listening');
});


