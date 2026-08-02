/**
 * Environment Variable Validation
 *
 * `MONGODB_URI` is validated eagerly because every page render needs the database.
 * The sync credentials are validated lazily, on first access, so that rendering the
 * public site (and building it in a preview environment) does not require the YouTube
 * and Google Places keys that only the sync pipeline uses.
 */

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `FATAL: Missing required environment variable: ${key}. ` +
      `Check your .env file or deployment environment.`
    );
  }
  return value;
};

const validateCoreEnv = () => {
  const uri = requireEnv('MONGODB_URI');

  if (!uri.startsWith('mongodb')) {
    throw new Error('FATAL: MONGODB_URI must be a valid MongoDB connection string.');
  }

  return uri;
};

export const env = {
  MONGODB_URI: validateCoreEnv(),
  DISQUS_SHORTNAME: process.env.NEXT_PUBLIC_DISQUS_SHORTNAME,

  // Sync-only credentials. Accessing any of these throws if it is missing, which keeps
  // the original fail-fast behaviour at the point of use rather than at import time.
  get YOUTUBE_API_KEY(): string {
    return requireEnv('YOUTUBE_API_KEY');
  },
  get GOOGLE_MAPS_API_KEY(): string {
    return requireEnv('GOOGLE_MAPS_API_KEY');
  },
  get SYNC_SECRET(): string {
    return requireEnv('SYNC_SECRET');
  },
  /**
   * Populated automatically by Vercel when a Blob store is linked to the project.
   * Only needed locally (in .env) if you run a sync or backfill on your machine.
   */
  get BLOB_READ_WRITE_TOKEN(): string {
    return requireEnv('BLOB_READ_WRITE_TOKEN');
  },
};
