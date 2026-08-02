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
  thumbnail: {
    small: String,
    large: String,
  },
  hasVeg: Boolean,
}, { timestamps: true, collection: 'videos' });

export default models.Video || model<VideoInterface>('Video', VideoSchema);
