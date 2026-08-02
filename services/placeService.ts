import dbConnect from "../lib/dbConnect";
import Place from "../models/Place";
import Video from "../models/Video";
import { PlaceInterface, VideoInterface } from "../types/types";
import { serializeDocument, serializeDocuments } from "../utils/serialize";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";

/**
 * Fields needed to render a feed card. Deliberately excludes `searchContent` and the
 * legacy `placePhotoBase64` — neither is rendered, and shipping them was the bulk of the
 * page weight.
 */
const LIST_FIELDS =
  "_id place_id name slug geometry hasVeg thumbnail allThumbnails formatted_address rating url photoUrl photoUpdatedAt photoAttribution";

/**
 * Fields needed by the place detail page. Note it does not render the place photo at all,
 * but `photoUrl` is kept cheap and available for metadata/social cards.
 */
const DETAIL_FIELDS =
  "_id place_id name slug geometry hasVeg thumbnail allThumbnails formatted_address rating user_ratings_total url photoUrl photoUpdatedAt photoAttribution videoIds international_phone_number opening_hours business_status createdAt updatedAt";

export const getPlacesPaginated = async (page: number = 1, limit: number = 10): Promise<{ data: PlaceInterface[], total: number }> => {
  await dbConnect();
  const fields = LIST_FIELDS;
  const skip = (page - 1) * limit;
  
  const [places, total] = await Promise.all([
    Place.find({}, fields).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Place.countDocuments({})
  ]);

  return {
    data: serializeDocuments<PlaceInterface>(places),
    total
  };
};

export const getPlaceBySlug = async (slug: string): Promise<PlaceInterface | null> => {
  await dbConnect();
  // Projected: an unprojected findOne shipped placePhotoBase64 (five copies of it) plus a
  // 10 KB searchContent blob into __NEXT_DATA__ for a page that renders neither.
  const place = await Place.findOne({ slug }, DETAIL_FIELDS).lean();
  return place ? serializeDocument<PlaceInterface>(place) : null;
};

export const getVideosForPlace = async (videoIds: string[]): Promise<VideoInterface[]> => {
  await dbConnect();
  const videos = await Video.find({ videoId: { $in: videoIds } }).lean();
  return serializeDocuments<VideoInterface>(videos);
};

export interface NearbyPlace {
  slug: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  hasVeg?: boolean;
  distanceKm: number;
}

interface GeoIndexEntry {
  slug: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  hasVeg?: boolean;
  lat: number;
  lng: number;
}

/**
 * In-process cache of every place's coordinates.
 *
 * `getNearbyPlaces` is called once per place page, so at build time that is 600+ calls.
 * Doing a database round trip (let alone a full aggregation) per call would add minutes to
 * the build; instead the whole set is loaded once per worker process — a few hundred KB —
 * and the nearest neighbours are computed in memory.
 *
 * The TTL matters for ISR: a long-lived serverless instance revalidating pages would
 * otherwise keep serving a neighbour list that predates any newly synced place.
 */
const GEO_INDEX_TTL_MS = 10 * 60 * 1000;
let geoIndexCache: { loadedAt: number; entries: Promise<GeoIndexEntry[]> } | null = null;

const loadGeoIndex = (): Promise<GeoIndexEntry[]> => {
  const now = Date.now();
  if (geoIndexCache && now - geoIndexCache.loadedAt < GEO_INDEX_TTL_MS) {
    return geoIndexCache.entries;
  }

  const entries = (async () => {
    await dbConnect();
    const docs = await Place.find(
      { "geometry.location.lat": { $ne: null }, "geometry.location.lng": { $ne: null } },
      "slug name formatted_address rating hasVeg geometry.location"
    ).lean<
      {
        slug: string;
        name: string;
        formatted_address?: string;
        rating?: number;
        hasVeg?: boolean;
        geometry?: { location?: { lat?: number; lng?: number } };
      }[]
    >();

    return docs
      .filter(
        (doc) =>
          typeof doc.geometry?.location?.lat === "number" &&
          typeof doc.geometry?.location?.lng === "number"
      )
      .map((doc) => ({
        slug: doc.slug,
        name: doc.name,
        formatted_address: doc.formatted_address,
        rating: doc.rating,
        hasVeg: doc.hasVeg,
        lat: doc.geometry!.location!.lat as number,
        lng: doc.geometry!.location!.lng as number,
      }));
  })();

  geoIndexCache = { loadedAt: now, entries };
  // A failed load must not be cached, or every subsequent page in this worker inherits it.
  entries.catch(() => {
    geoIndexCache = null;
  });

  return entries;
};

/**
 * Finds the closest other places to the given one.
 *
 * This exists for internal linking as much as for readers. Previously the only outbound
 * link from a place page was "back to home", so the 600+ place pages formed no link graph
 * at all — they were reachable solely from the sitemap, which gives a crawler no signal
 * about how they relate or which are important. Cross-linking neighbours turns the site
 * into a connected graph and gives every page inbound links from topically related pages.
 */
export const getNearbyPlaces = async (
  place: PlaceInterface,
  limit: number
): Promise<NearbyPlace[]> => {
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return [];

  const index = await loadGeoIndex();

  return index
    .filter((entry) => entry.slug !== place.slug)
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      formatted_address: entry.formatted_address,
      rating: entry.rating,
      hasVeg: entry.hasVeg,
      distanceKm: getDisplacementFromLatLonInKm(lat, lng, entry.lat, entry.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((entry) => ({ ...entry, distanceKm: Math.round(entry.distanceKm * 10) / 10 }));
};

export const getAllPlaceSlugs = async (): Promise<{ slug: string; updatedAt: string }[]> => {
  await dbConnect();
  const response = await Place.find({}, "slug updatedAt").lean<PlaceInterface[]>();
  return response.map((ele) => ({
    slug: ele.slug,
    updatedAt: ele.updatedAt ? new Date(ele.updatedAt).toISOString() : new Date().toISOString()
  }));
};
