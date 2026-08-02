import dbConnect from "../lib/dbConnect";
import Place from "../models/Place";
import Video from "../models/Video";
import { PlaceInterface, VideoInterface } from "../types/types";
import { serializeDocument, serializeDocuments } from "../utils/serialize";

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
  "_id place_id name slug geometry hasVeg thumbnail allThumbnails formatted_address rating url photoUrl photoUpdatedAt photoAttribution videoIds international_phone_number opening_hours business_status createdAt updatedAt";

/**
 * Fetches only the fields required for the home page listing.
 */
export const getAllPlaces = async (): Promise<PlaceInterface[]> => {
  await dbConnect();
  const places = await Place.find({}, LIST_FIELDS).lean();
  return serializeDocuments<PlaceInterface>(places);
};

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

export const getPlaceById = async (place_id: string): Promise<PlaceInterface | null> => {
  await dbConnect();
  const place = await Place.findOne({ place_id }, DETAIL_FIELDS).lean();
  return place ? serializeDocument<PlaceInterface>(place) : null;
};

export const getVideosForPlace = async (videoIds: string[]): Promise<VideoInterface[]> => {
  await dbConnect();
  const videos = await Video.find({ videoId: { $in: videoIds } }).lean();
  return serializeDocuments<VideoInterface>(videos);
};

export const getAllPlaceSlugs = async (): Promise<{ slug: string; updatedAt: string }[]> => {
  await dbConnect();
  const response = await Place.find({}, "slug updatedAt").lean<PlaceInterface[]>();
  return response.map((ele) => ({
    slug: ele.slug,
    updatedAt: ele.updatedAt ? new Date(ele.updatedAt).toISOString() : new Date().toISOString()
  }));
};
