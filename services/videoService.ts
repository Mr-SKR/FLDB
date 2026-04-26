import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import SearchIndex from "../models/SearchIndex";
import { VideoInterface, SearchIndexInterface } from "../types/types";
import { serializeDocument, serializeDocuments } from "../utils/serialize";

/**
 * Fetches only the fields required for the home page listing.
 */
export const getAllVideos = async (): Promise<VideoInterface[]> => {
  await dbConnect();
  const fields = "_id videoId name videoTitle geometry hasVeg thumbnail";
  const videos = await Video.find({}, fields).lean();
  return serializeDocuments<VideoInterface>(videos);
};

export const getVideoById = async (videoId: string): Promise<VideoInterface | null> => {
  await dbConnect();
  const video = await Video.findOne({ videoId }).lean();
  return video ? serializeDocument<VideoInterface>(video) : null;
};

export const getAllVideoIds = async (): Promise<string[]> => {
  await dbConnect();
  const response: SearchIndexInterface[] = await SearchIndex.find({}, "videoId").lean();
  return response.map((ele) => ele.videoId);
};
