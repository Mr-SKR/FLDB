interface VideoInterface {
  _id: string;
  videoId: string;
  videoTitle: string;
  videoDescription?: string;
  business_status?: string;
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
  name: string;
  opening_hours?: {
    open_now?: boolean;
    periods?: any[];
    weekday_text?: string[];
  };
  place_id?: string;
  rating?: string | number;
  url?: string;
  hasVeg?: boolean;
  thumbnail?: {
    small: string;
    large: string;
  };
  displacement?: number;
  title?: string;
}

interface SearchIndexInterface {
  _id: string;
  videoId: string;
  videoTitle: string;
  title?: string;
}

export type { VideoInterface, SearchIndexInterface };
