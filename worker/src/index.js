import 'dotenv/config';
import pino from 'pino';
import mongoose from 'mongoose';
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'node:crypto';

const logger = pino({ name: 'worker' });

// Mongo model (duplicated minimal schema to avoid coupling)
const attemptSchema = new mongoose.Schema(
  {
    at: Date,
    statusCode: Number,
    ok: Boolean,
    error: String,
  },
  { _id: false }
);
const noteSchema = new mongoose.Schema({
  title: String,
  body: String,
  releaseAt: Date,
  webhookUrl: String,
  status: String,
  attempts: [attemptSchema],
  deliveredAt: Date,
});
const Note = mongoose.model('Note', noteSchema);

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes';
const queueName = process.env.QUEUE_NAME || 'deliver-notes';
const backoffArray = (process.env.BACKOFF_MS || '1000,5000,25000')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n));

const connection = new IORedis(redisUrl);
const queue = new Queue(queueName, { connection });
const queueEvents = new QueueEvents(queueName, { connection });

function idempotencyKey(noteId, releaseAt) {
  const input = `${noteId}:${new Date(releaseAt).toISOString()}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, { autoIndex: true });
  logger.info('Worker connected to MongoDB');
}

async function enqueueDueNotes() {
  const now = new Date();
  const due = await Note.find({ status: 'pending', releaseAt: { $lte: now } })
    .limit(100)
    .lean();
  if (due.length === 0) return;
  await Promise.all(
    due.map((n) =>
      queue.add(
        'deliver',
        { noteId: n._id.toString() },
        {
          removeOnComplete: true,
          removeOnFail: true,
          attempts: backoffArray.length + 1,
          backoff: { type: 'custom' },
        }
      )
    )
  );
}

async function deliverNote(noteId) {
  const note = await Note.findById(noteId);
  if (!note) return;
  if (note.status !== 'pending') return;

  const url = note.webhookUrl;
  const key = idempotencyKey(note._id.toString(), note.releaseAt);

  let resp;
  try {
    const started = Date.now();
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Note-Id': note._id.toString(),
        'X-Idempotency-Key': key,
      },
      body: JSON.stringify({ id: note._id.toString(), title: note.title, body: note.body, releaseAt: note.releaseAt }),
    });
    const ms = Date.now() - started;
    note.attempts.push({ at: new Date(), statusCode: resp.status, ok: resp.ok });
    if (resp.ok) {
      note.status = 'delivered';
      note.deliveredAt = new Date();
    }
    await note.save();
    logger.info({ noteId, try: note.attempts.length, statusCode: resp.status, ok: resp.ok, ms, at: new Date().toISOString() }, 'delivery attempt');
    if (!resp.ok) throw new Error(`Non-2xx response: ${resp.status}`);
  } catch (err) {
    const errorMsg = err?.message || String(err);
    if (!resp) {
      note.attempts.push({ at: new Date(), statusCode: 0, ok: false, error: errorMsg });
      await note.save();
    }
    throw err;
  }
}

const worker = new Worker(
  queueName,
  async (job) => {
    const { noteId } = job.data;
    await deliverNote(noteId);
  },
  {
    connection,
    settings: {
      backoffStrategies: {
        custom: function (_attemptsMade, _err) {
          const idx = Math.min(_attemptsMade - 1, backoffArray.length - 1);
          return backoffArray[idx] || backoffArray[backoffArray.length - 1] || 1000;
        },
      },
    },
  }
);

worker.on('failed', async (job, err) => {
  const noteId = job?.data?.noteId;
  const note = noteId ? await Note.findById(noteId) : null;
  const tries = job?.attemptsMade || note?.attempts?.length || 0;
  logger.warn({ noteId, err: err?.message, tries }, 'job failed');
  const maxAttempts = job?.opts?.attempts ?? backoffArray.length + 1;
  if (tries >= maxAttempts && note) {
    note.status = 'dead';
    await note.save();
    logger.warn({ noteId }, 'marked dead');
  }
});

async function pollLoop() {
  try {
    await enqueueDueNotes();
  } catch (e) {
    logger.error({ err: e?.message }, 'poll error');
  } finally {
    setTimeout(pollLoop, 5000);
  }
}

await connectMongo();
pollLoop();
logger.info('Worker started');

export { idempotencyKey, enqueueDueNotes, deliverNote, Note };


