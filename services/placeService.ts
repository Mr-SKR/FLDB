import dbConnect from "../lib/dbConnect";
import Place from "../models/Place";
import Video from "../models/Video";
import { PlaceInterface, VideoInterface } from "../types/types";
import { serializeDocument, serializeDocuments } from "../utils/serialize";

/**
 * Fetches only the fields required for the home page listing.
 */
export const getAllPlaces = async (): Promise<PlaceInterface[]> => {
  await dbConnect();
  const fields = "_id place_id name slug geometry hasVeg thumbnail formatted_address rating url";
  const places = await Place.find({}, fields).lean();
  return serializeDocuments<PlaceInterface>(places);
};

export const getPlacesPaginated = async (page: number = 1, limit: number = 10): Promise<{ data: PlaceInterface[], total: number }> => {
  await dbConnect();
  const fields = "_id place_id name slug geometry hasVeg thumbnail formatted_address rating url";
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
  const place = await Place.findOne({ slug }).lean();
  return place ? serializeDocument<PlaceInterface>(place) : null;
};

export const getPlaceById = async (place_id: string): Promise<PlaceInterface | null> => {
  await dbConnect();
  const place = await Place.findOne({ place_id }).lean();
  return place ? serializeDocument<PlaceInterface>(place) : null;
};

export const getVideosForPlace = async (videoIds: string[]): Promise<VideoInterface[]> => {
  await dbConnect();
  const videos = await Video.find({ videoId: { $in: videoIds } }).lean();
  return serializeDocuments<VideoInterface>(videos);
};

export const getAllPlaceSlugs = async (): Promise<string[]> => {
  await dbConnect();
  const response = await Place.find({}, "slug").lean();
  return response.map((ele) => ele.slug);
};
