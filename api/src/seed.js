import 'dotenv/config';
import { connectMongo } from './mongo.js';
import { Note } from './models/note.js';

await connectMongo(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes', console);
await Note.deleteMany({});
await Note.create({
  title: 'Seeded immediate',
  body: 'Hello',
  releaseAt: new Date(Date.now() - 1000),
  webhookUrl: 'http://localhost:4000/sink',
  status: 'pending',
});
console.log('Seeded');
process.exit(0);


