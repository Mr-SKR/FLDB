import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

const MONGODB_URI = env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
    };

    logger.debug('Connecting to MongoDB...');
    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      logger.info('MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    logger.error('Failed to connect to MongoDB', 'dbConnect', e);
    throw e;
  }

  return cached!.conn;
}

export default dbConnect;
