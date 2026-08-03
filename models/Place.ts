import { Schema, model, models } from 'mongoose';
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
  // Google always returns a numeric rating, and every stored document is already a
  // double or int; `Mixed` only removed the cast that would keep it that way.
  rating: Number,
  /** Google review count. Needed to emit a valid schema.org AggregateRating. */
  user_ratings_total: Number,
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
  placePhotoReference: String,
  /**
   * DEPRECATED: legacy base64 data URL. Retained only so the site keeps rendering while
   * the blob backfill runs; unset by the `cleanup-photo-blobs` sync action once verified.
   */
  placePhotoBase64: String,
  /** Stable blob path, e.g. "places/<place_id>.webp". Survives a provider change. */
  photoKey: String,
  /** Public URL of the stored photo: what the frontend renders. */
  photoUrl: String,
  /** Bumped when the photo bytes change; used purely to bust caches. */
  photoUpdatedAt: Date,
  /** Google requires photo attributions to be displayed alongside the image. */
  photoAttribution: [String],
  allThumbnails: [{
    small: String,
    large: String,
    source: String,
  }],
  slug: { type: String, required: true, unique: true },
  searchContent: String,
}, { timestamps: true, collection: 'places' });

export default models.Place || model<PlaceInterface>('Place', PlaceSchema);
