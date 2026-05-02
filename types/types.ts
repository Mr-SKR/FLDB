export interface VideoInterface {
  _id: string;
  videoId: string;
  videoTitle: string;
  videoDescription?: string;
  channelId?: string;
  channelTitle?: string;
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
  rating?: string | number;
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
  placePhotoBase64?: string;
  allThumbnails?: {
    small?: string;
    large?: string;
    source?: "place" | "youtube";
  }[];
  searchContent?: string; // Aggregated text for full-text search
}
