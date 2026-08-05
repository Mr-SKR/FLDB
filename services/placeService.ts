import dbConnect from "../lib/dbConnect";
import Place from "../models/Place";
import Video from "../models/Video";
import { PlaceInterface, VideoInterface } from "../types/types";
import { serializeDocument, serializeDocuments } from "../utils/serialize";
import { getDisplacementFromLatLonInKm, roundDistanceKm } from "../utils/getGeoDisplacement";

/**
 * Fields needed to render a feed card. Deliberately excludes `searchContent` and the
 * legacy `placePhotoBase64`. Neither is rendered, and shipping them was the bulk of the
 * page weight.
 *
 * Single source of truth: `/api/search` renders the same cards from an aggregation and
 * previously repeated this list twice more in its own file, so a field added for the card
 * had to be remembered in three places or the feed would render it only on the
 * server-rendered first page.
 */
const LIST_FIELD_NAMES = [
  "_id",
  "place_id",
  "name",
  "slug",
  "geometry",
  "hasVeg",
  "thumbnail",
  "allThumbnails",
  "formatted_address",
  "rating",
  // Both are scalars, and both are rendered on the card: a rating without its count says
  // very little, and a place Google lists as closed must not look like a normal result.
  "user_ratings_total",
  "business_status",
  "url",
  "photoUrl",
  "photoUpdatedAt",
  "photoAttribution",
] as const;

/** Space-separated form, for `Model.find(filter, fields)`. */
const LIST_FIELDS = LIST_FIELD_NAMES.join(" ");

/** `$project` form, for aggregation pipelines. */
export const LIST_PROJECTION: Record<string, 1> = Object.fromEntries(
  LIST_FIELD_NAMES.map((field) => [field, 1])
);

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
    // `_id` breaks ties: names are not unique (chains), and this shares its ordering with
    // /api/search, which pages through the same list.
    Place.find({}, fields).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
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
  user_ratings_total?: number;
  hasVeg?: boolean;
  distanceKm: number;
  /** One image for the card. Absent when the place has no usable photo. */
  image?: string;
}

interface GeoIndexEntry {
  slug: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  hasVeg?: boolean;
  image?: string;
  lat: number;
  lng: number;
}

/**
 * In-process cache of every place's coordinates.
 *
 * `getNearbyPlaces` is called once per place page, so at build time that is 600+ calls.
 * Doing a database round trip (let alone a full aggregation) per call would add minutes to
 * the build; instead the whole set is loaded once per worker process (a few hundred KB)
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
    // `photoUrl` and `thumbnail` are read so the nearby cards can carry an image. Both are
    // short strings; `allThumbnails` is deliberately not loaded, since one picture is all a
    // cross-link needs and this index holds every place in the catalogue at once.
    const docs = await Place.find(
      { "geometry.location.lat": { $ne: null }, "geometry.location.lng": { $ne: null } },
      "slug name formatted_address rating user_ratings_total hasVeg geometry.location photoUrl thumbnail"
    ).lean<
      {
        slug: string;
        name: string;
        formatted_address?: string;
        rating?: number;
        user_ratings_total?: number;
        hasVeg?: boolean;
        photoUrl?: string;
        thumbnail?: { small?: string; large?: string };
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
        /*
          Both keys are omitted rather than set to `undefined` when absent.

          These end up in `getStaticProps` props, and Next refuses to serialize an explicit
          `undefined` ("cannot be serialized as JSON"), which would fail the build for any
          place whose neighbour happens to have no photo. An absent key serializes fine.

          Place photo first, matching the ordering the sync applies to `allThumbnails`.
        */
        ...(typeof doc.user_ratings_total === "number"
          ? { user_ratings_total: doc.user_ratings_total }
          : {}),
        ...(doc.photoUrl || doc.thumbnail?.large || doc.thumbnail?.small
          ? { image: (doc.photoUrl || doc.thumbnail?.large || doc.thumbnail?.small) as string }
          : {}),
        lat: doc.geometry!.location!.lat as number,
        lng: doc.geometry!.location!.lng as number,
      }));
  })();

  const cacheEntry = { loadedAt: now, entries };
  geoIndexCache = cacheEntry;
  // A failed load must not be cached, or every subsequent page in this worker inherits it.
  // Only clear it if this load is still the cached one, because a concurrent load that already
  // succeeded must not have its result thrown away by an older failure.
  entries.catch(() => {
    if (geoIndexCache === cacheEntry) geoIndexCache = null;
  });

  return entries;
};

/**
 * Finds the closest other places to the given one.
 *
 * This exists for internal linking as much as for readers. Previously the only outbound
 * link from a place page was "back to home", so the 600+ place pages formed no link graph
 * at all: they were reachable solely from the sitemap, which gives a crawler no signal
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
    .map(({ lat: _lat, lng: _lng, ...entry }) => ({
      // Spread rather than picked field by field, so the optional keys the index chose to
      // omit stay omitted instead of reappearing as an unserializable `undefined`. The
      // coordinates are dropped: they are the index's business, not the card's.
      ...entry,
      distanceKm: getDisplacementFromLatLonInKm(lat, lng, _lat, _lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((entry) => ({ ...entry, distanceKm: roundDistanceKm(entry.distanceKm) }));
};

export const getAllPlaceSlugs = async (): Promise<{ slug: string; updatedAt: string }[]> => {
  await dbConnect();
  const response = await Place.find({}, "slug updatedAt").lean<PlaceInterface[]>();
  return response.map((ele) => ({
    slug: ele.slug,
    updatedAt: ele.updatedAt ? new Date(ele.updatedAt).toISOString() : new Date().toISOString()
  }));
};
