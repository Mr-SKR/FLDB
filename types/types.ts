export interface VideoInterface {
  _id: string;
  videoId: string;
  videoTitle: string;
  videoDescription?: string;
  channelId?: string;
  channelTitle?: string;
  /**
   * YouTube publish timestamp. Required by schema.org `VideoObject` (`uploadDate`), which
   * is why it is captured. It comes free in the snippet the sync already requests.
   */
  publishedAt?: string | Date;
  /**
   * Set once the video's places have been fully resolved (including resolving to none).
   * Absent means the last sync did not finish, and a soft sync should retry it rather than
   * treat the video as done.
   */
  placesResolvedAt?: string | Date;
  thumbnail?: {
    small?: string;
    large?: string;
  };
  hasVeg?: boolean; // Keep it here if needed for sync logic
}

export interface PlaceInterface {
  _id: string;
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  international_phone_number?: string;
  rating?: number;
  /**
   * Number of Google reviews behind `rating`. Captured because schema.org `AggregateRating`
   * is invalid without a count. The rating alone cannot be marked up.
   */
  user_ratings_total?: number;
  url?: string; // Google Maps URL
  opening_hours?: {
    open_now?: boolean;
    periods?: unknown[];
    weekday_text?: string[];
  };
  business_status?: string;
  videoIds: string[]; // IDs of videos featuring this place
  hasVeg?: boolean;
  displacement?: number; // Calculated field for UI
  slug: string;
  thumbnail?: {
    small?: string;
    large?: string;
  };
  placePhotoReference?: string;
  /** @deprecated legacy base64 data URL; removed after the blob migration is verified. */
  placePhotoBase64?: string;
  /** Stable blob path, e.g. "places/<place_id>.webp". */
  photoKey?: string;
  /** Public URL of the stored photo. */
  photoUrl?: string;
  photoUpdatedAt?: string | Date;
  photoAttribution?: string[];
  allThumbnails?: {
    small?: string;
    large?: string;
    source?: "place" | "youtube";
  }[];
  searchContent?: string; // Aggregated text for full-text search
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
