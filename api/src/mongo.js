import mongoose from 'mongoose';

export async function connectMongo(uri, logger) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  logger.info('Connected to MongoDB');
}


