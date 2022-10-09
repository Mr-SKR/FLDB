import axios from "axios";

export const getAllVideoIds = async (): Promise<string[]> => {
  // TODO: Create a separate endpoint to fetch video Ids
  const { data: response }: { data: { videoId: string }[] } = await axios.get(
    process.env.NEXT_PUBLIC_FLDB_API_BASE_URL + "/searchindices",
    {
      timeout: 10000,
    }
  );
  return response.map((ele) => ele.videoId);
};
