/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid before the app starts.
 */

const requiredEnvVars = [
  'MONGODB_URI',
  'YOUTUBE_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'SYNC_SECRET',
] as const;

export type EnvVar = (typeof requiredEnvVars)[number];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables: ${missing.join(', ')}. ` +
      `Check your .env file or deployment environment.`
    );
  }

  // Add specific format validations if needed
  if (!process.env.MONGODB_URI?.startsWith('mongodb')) {
    throw new Error('FATAL: MONGODB_URI must be a valid MongoDB connection string.');
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY!,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY!,
    SYNC_SECRET: process.env.SYNC_SECRET!,
    DISQUS_SHORTNAME: process.env.NEXT_PUBLIC_DISQUS_SHORTNAME,
  };
};

export const env = validateEnv();
