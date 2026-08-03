import { Schema, model, models } from 'mongoose';
import { VideoInterface } from '../types/types';

const VideoSchema = new Schema<VideoInterface>({
  videoId: { type: String, required: true, unique: true },
  videoTitle: { type: String, required: true },
  videoDescription: String,
  channelId: String,
  channelTitle: String,
  /** YouTube publish date; required by schema.org VideoObject (`uploadDate`). */
  publishedAt: Date,
  /**
   * Set once this video's description has been fully resolved into places, including the
   * legitimate outcome of zero places, when the description carries no Maps link.
   *
   * Absent means the resolution did not complete: a place failed to save, or the Places
   * lookup threw. This is what lets a soft sync tell "nothing to do" apart from "the last
   * attempt half-finished", so the latter is retried instead of being skipped forever.
   */
  placesResolvedAt: Date,
  thumbnail: {
    small: String,
    large: String,
  },
  hasVeg: Boolean,
}, { timestamps: true, collection: 'videos' });

export default models.Video || model<VideoInterface>('Video', VideoSchema);
