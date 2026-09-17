import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';

/**
 * MongoDB / Mongoose Connection Cache Infrastructure
 * 
 * Invariants:
 * - Server-side execution only
 * - Connection caching across Next.js dev server hot-reloads
 * - Clear, sanitized error logging without credential leakage
 * - Single source of truth for DB connectivity
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // Global cache allows connection reuse across module reloads in Next.js development
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      autoIndex: config.isDevelopment
    };

    logger.info('Initiating MongoDB connection...');

    cached.promise = mongoose.connect(config.database.uri, opts)
      .then((mongooseInstance) => {
        logger.info('MongoDB connected successfully');
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        logger.error('Failed to connect to MongoDB', { error: err.message });
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
