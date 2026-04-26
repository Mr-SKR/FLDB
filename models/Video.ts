import mongoose, { Schema, model, models } from 'mongoose';
import { VideoInterface } from '../types/types';

const VideoSchema = new Schema<VideoInterface>({
  videoId: { type: String, required: true, unique: true },
  videoTitle: { type: String, required: true },
  videoDescription: String,
  business_status: String,
  formatted_address: String,
  geometry: {
    location: {
      lat: Number,
      lng: Number,
    },
  },
  international_phone_number: String,
  name: { type: String, required: true },
  opening_hours: { weekday_text: [String] },
  place_id: String,
  rating: String,
  url: String,
  hasVeg: Boolean,
  thumbnail: {
    small: String,
    large: String,
  },
  displacement: Number,
  title: String,
}, { timestamps: true, collection: 'videos' });

export default models.Video || model<VideoInterface>('Video', VideoSchema);
