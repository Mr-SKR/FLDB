import mongoose, { Schema, model, models } from 'mongoose';
import { PlaceInterface } from '../types/types';

const PlaceSchema = new Schema<PlaceInterface>({
  place_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  formatted_address: String,
  geometry: {
    location: {
      lat: Number,
      lng: Number,
    },
    viewport: {
      northeast: { lat: Number, lng: Number },
      southwest: { lat: Number, lng: Number },
    },
  },
  international_phone_number: String,
  rating: Schema.Types.Mixed,
  url: String,
  opening_hours: {
    open_now: Boolean,
    weekday_text: [String],
  },
  business_status: String,
  videoIds: [{ type: String }],
  hasVeg: Boolean,
  thumbnail: {
    small: String,
    large: String,
  },
  slug: { type: String, required: true, unique: true },
  searchContent: String,
}, { timestamps: true, collection: 'places' });

export default models.Place || model<PlaceInterface>('Place', PlaceSchema);
