import { google, youtube_v3 } from "googleapis";
import { Client } from "@googlemaps/google-maps-services-js";
import sharp from "sharp";
import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import Place from "../models/Place";
import { syncConfig } from "../config/syncConfig";
import { fetchLocationDetails } from "../lib/locationDetails";
import { slugify, slugSuffix } from "../utils/slugify";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { PlaceInterface, VideoInterface } from "../types/types";
import { sleep } from "../utils/sleep";
import { uploadPlacePhoto, photoSrc, StoredPhoto } from "../lib/blob";

const youtube: youtube_v3.Youtube = google.youtube("v3");
const googleMapsClient = new Client({});

/**
 * Largest size the legacy Place Photos endpoint will serve (maxwidth caps at 1600).
 * More than covers the feed card, which is capped at 500px CSS width; 1600px is still
 * sharp on a 3x DPR display.
 */
const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_QUALITY = 82;

/**
 * Downloads a place photo from Google and uploads it to blob storage.
 *
 * Previously this encoded the image to a base64 data URL stored on the document itself,
 * which cost ~255 KB per place (the same string was written to five fields) and capped
 * resolution at 480px to fit the free database tier.
 */
export const fetchAndStorePlacePhoto = async (
  placeId: string,
  photoReference: string
): Promise<StoredPhoto | undefined> => {
  if (!photoReference) return undefined;

  const apiKey = env.GOOGLE_MAPS_API_KEY;

  try {
    const response = await googleMapsClient.placePhoto({
      params: {
        photoreference: photoReference,
        maxwidth: PHOTO_MAX_DIMENSION,
        key: apiKey,
      },
      responseType: "arraybuffer",
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch photo: ${response.statusText}`);
    }

    const optimised = await sharp(response.data as ArrayBuffer)
      .resize(PHOTO_MAX_DIMENSION, PHOTO_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_QUALITY })
      .toBuffer();

    const stored = await uploadPlacePhoto(placeId, optimised);
    logger.info(
      `Stored photo for ${placeId} (${Math.round(optimised.length / 1024)} KB)`,
      "syncService"
    );
    return stored;
  } catch (err) {
    logger.error(`Error storing place photo for ${placeId}`, "syncService", err);
    return undefined;
  }
};

/**
 * Cleans video description by removing URLs and extra noise for search indexing.
 */
const cleanDescription = (text: string) => {
  return text
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/[^\w\s\u00C0-\u017F]/g, " ") // Remove special chars but keep accented ones
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};

/**
 * Rebuilds the searchContent and allThumbnails for a place by aggregating info from its videos.
 * Mutates the passed place document in place.
 */
const updatePlaceSearchContent = async (place: PlaceInterface) => {
  if (!place) return;

  const videos = await Video.find({ videoId: { $in: place.videoIds } });
  const videoTexts = videos.map(v => `${v.videoTitle} ${cleanDescription(v.videoDescription || "")}`).join(" ");
  
  place.searchContent = `${place.name} ${place.formatted_address || ""} ${videoTexts}`.substring(0, 10000); // Cap size
  
  // Update hasVeg based on videos
  place.hasVeg = videos.some(v => v.hasVeg);

  // Update allThumbnails.
  //
  // These carry URLs only. They previously carried the base64 image *bytes*, and because
  // the same string was written to small+large here, to small+large on `thumbnail`, and to
  // `placePhotoBase64`, every place stored five copies of its own photo (~255 KB each).
  const allThumbnails: { small?: string; large?: string; source?: "place" | "youtube" }[] = [];

  // 1. Place photo, preferring the blob URL and falling back to the legacy base64 so the
  //    site keeps rendering for places the backfill has not reached yet.
  //
  //    The blob URL carries a `?v=<photoUpdatedAt>` token. Blob keys are stable and the
  //    bytes are uploaded with a one-year immutable cache, so without this token a re-synced
  //    photo would never reach anyone: both the browser and Vercel's image cache would keep
  //    serving the previous image at the same URL. Callers must therefore set
  //    `photoUpdatedAt` before invoking this function, and both the sync and backfill paths do.
  const placePhoto =
    photoSrc(place.photoUrl, place.photoUpdatedAt) ||
    (place.placePhotoBase64 && place.placePhotoBase64 !== "none"
      ? place.placePhotoBase64
      : undefined);

  if (placePhoto) {
    allThumbnails.push({ small: placePhoto, large: placePhoto, source: "place" });
  }

  // 2. Add YouTube thumbnails
  const videoThumbs = videos
    .map(v => v.thumbnail)
    .filter((t): t is { small: string; large: string } => !!t && (!!t.small || !!t.large))
    .map(t => ({ ...t, source: "youtube" as const }));

  allThumbnails.push(...videoThumbs);

  place.allThumbnails = allThumbnails;

  // Set main thumbnail to the first available one
  if (allThumbnails.length > 0) {
    place.thumbnail = {
      small: allThumbnails[0].small,
      large: allThumbnails[0].large
    };
  }
};

/**
 * Builds a slug that is unique across places.
 *
 * `Place.slug` carries a unique index, and slugs are derived from restaurant names, so
 * two different outlets sharing a name would otherwise collide on E11000 and be dropped.
 * When the base slug is already owned by a *different* place_id we append a deterministic
 * suffix instead.
 *
 * Only ever called when creating a new place, because existing slugs are immutable because they
 * are live URLs referenced by the sitemap and by Disqus threads.
 */
const buildUniqueSlug = async (name: string, placeId: string): Promise<string> => {
  const base = slugify(name) || "place";

  const owner = await Place.findOne({ slug: base }, "place_id").lean<{ place_id: string } | null>();
  if (!owner || owner.place_id === placeId) return base;

  let candidate = `${base}-${slugSuffix(placeId)}`;
  let attempt = 2;
  // The suffix is derived from a unique place_id, so this loop realistically never runs;
  // it exists so a hash collision degrades gracefully instead of dropping the place.
  while (await Place.exists({ slug: candidate })) {
    candidate = `${base}-${slugSuffix(placeId)}-${attempt}`;
    attempt += 1;
  }

  logger.info(
    `Slug "${base}" is already taken by another place; using "${candidate}" for ${placeId}`,
    "syncService"
  );
  return candidate;
};

/**
 * Whether a video has already been carried all the way through place resolution.
 *
 * `placesResolvedAt` is the real signal, but it only exists on videos written since it was
 * introduced. Videos that predate it are recognised by the places pointing at them, so
 * adding this check does not make the next sync reprocess the entire back catalogue. The
 * only videos that get one extra pass are those that genuinely produced no places, which
 * is exactly the set worth re-checking once.
 *
 * Known limitation of that fallback: a video that saved *some* of its places and failed on
 * the rest still looks resolved, because places do point at it. Once the catalogue has been
 * through one full sync every video carries a stamp, at which point the fallback can be
 * deleted and the stamp becomes authoritative on its own.
 */
const hasResolvedPlaces = async (video: { placesResolvedAt?: unknown } | null, videoId: string) => {
  if (video?.placesResolvedAt) return true;
  return (await Place.exists({ videoIds: videoId })) !== null;
};

/** Marks a video's place resolution as complete. See `Video.placesResolvedAt`. */
const markPlacesResolved = async (videoId: string) => {
  await Video.updateOne({ videoId }, { $set: { placesResolvedAt: new Date() } });
};

/**
 * Withdraws the resolution stamp after an incomplete run.
 *
 * Needed because a re-sync of an already-resolved video inherits the previous stamp, so
 * without clearing it a hard sync that failed halfway would still report as resolved. The
 * invariant this preserves: a stamp is present only if the most recent attempt finished.
 */
const markPlacesUnresolved = async (videoId: string) => {
  await Video.updateOne({ videoId }, { $unset: { placesResolvedAt: "" } });
};

/** Same question, asked once for a whole page of videos. */
const resolvedVideoIds = async (): Promise<Set<string>> => {
  const [stamped, linked] = await Promise.all([
    Video.find({ placesResolvedAt: { $exists: true } }, "videoId").lean<{ videoId: string }[]>(),
    Place.distinct("videoIds") as Promise<string[]>,
  ]);
  return new Set([...stamped.map((doc) => doc.videoId), ...linked]);
};

/**
 * Fetches one page of a single playlist.
 *
 * Deliberately takes a required `playlistId` and returns exactly one page. It previously
 * accepted no playlist at all, in which case it walked every configured playlist to
 * exhaustion in one request: dozens of YouTube quota units, and a response the paginated
 * admin UI could not use anyway. The caller always knows which playlist it wants.
 *
 * Errors propagate rather than being logged and swallowed. Swallowing them meant a quota
 * exhaustion or a bad playlist id returned HTTP 200 with whatever had been collected so
 * far, which the admin UI rendered as "No videos loaded", indistinguishable from an empty
 * playlist, and the reason a failed sync looked like a successful no-op.
 */
export const getPlaylistVideos = async (playlistId: string, pageToken?: string) => {
  logger.info(`Fetching playlist videos for playlist ${playlistId}`, "syncService");
  const youtubeKey = env.YOUTUBE_API_KEY;

  const vegPlaylistIds = syncConfig.sources.flatMap(s => s.playlists.filter(p => p.isVeg).map(p => p.id));

  const response = await youtube.playlistItems.list({
    key: youtubeKey,
    part: ["snippet"],
    playlistId,
    maxResults: 50,
    pageToken,
  });

  const videosInPlayLists: youtube_v3.Schema$PlaylistItem[] = response.data.items || [];
  const nextPageToken = response.data.nextPageToken || undefined;
  const prevPageToken = response.data.prevPageToken || undefined;

  await dbConnect();
  // "Synced" must mean fully resolved, not merely recorded. A video whose places failed to
  // save is still outstanding work, and "Sync Current Page" only processes rows this flag
  // marks as unsynced, so showing it as done would put it permanently out of reach.
  const resolved = await resolvedVideoIds();

  interface MappedVideo {
    videoId: string;
    title?: string | null;
    thumbnail?: string | null;
    isVeg: boolean;
    isSynced: boolean;
    channelTitle?: string | null;
    channelId?: string | null;
  }

  // Deduplicate and prioritize isVeg
  const videoMap = new Map<string, MappedVideo>();

  for (const item of videosInPlayLists) {
    const vId = item.snippet?.resourceId?.videoId;
    if (!vId) continue;

    const isVeg = vegPlaylistIds.includes(item.snippet?.playlistId || "");
    
    const existing = videoMap.get(vId);
    if (existing) {
      if (isVeg) existing.isVeg = true;
    } else {
      videoMap.set(vId, {
        videoId: vId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.default?.url,
        isVeg: isVeg,
        isSynced: resolved.has(vId),
        channelTitle: item.snippet?.channelTitle,
        channelId: item.snippet?.channelId,
      });
    }
  }

  const mappedVideos = Array.from(videoMap.values());

  return {
    videos: mappedVideos,
    nextPageToken,
    prevPageToken
  };
};

export const syncSingleVideo = async (videoId: string, mode: "soft" | "hard" = "soft", isVeg = false) => {
  logger.info(`Starting sync operation for video: ${videoId}`, "syncService", { mode, isVeg });
  const youtubeKey = env.YOUTUBE_API_KEY;

  await dbConnect();

  const existingVideo = await Video.findOne({ videoId });
  
  // If soft sync and video exists, check if we need to upgrade to hasVeg
  if (mode === "soft" && existingVideo) {
    if (isVeg && !existingVideo.hasVeg) {
      logger.info(`UPGRADING: Video ${videoId} exists but now identified as Veg. Updating hasVeg to true.`, "syncService");
      existingVideo.hasVeg = true;
      await existingVideo.save();

      // Update all associated places' hasVeg status
      await Place.updateMany({ videoIds: videoId }, { hasVeg: true });
      return { status: "updated", message: "Video upgraded to Veg status" };
    }

    // Skip on *resolution*, not on the video record existing.
    //
    // The video is written before its places (so a description with no Maps link is not
    // reprocessed on every run), which means the two can disagree: if a place then fails
    // to save, the video is on file while its restaurants are not. Keying the skip on the
    // record alone stranded those places permanently, because a soft sync would never look
    // at the video again and only a hand-run hard sync could recover them.
    if (await hasResolvedPlaces(existingVideo, videoId)) {
      logger.info(`SKIPPED: Video ${videoId} already exists in database (Soft Sync)`, "syncService");
      return { status: "skipped", message: "Video already exists" };
    }

    logger.info(
      `RETRYING: Video ${videoId} is recorded but its places were never resolved; reprocessing.`,
      "syncService"
    );
  }

  try {
    logger.debug(`Fetching video details from YouTube API for: ${videoId}`, "syncService");
    const videoDetailsResponse = await youtube.videos.list({
      key: youtubeKey,
      part: ["snippet"],
      id: [videoId],
    });

    const video = videoDetailsResponse.data.items?.[0];
    if (!video?.snippet?.description || !video?.snippet?.title || !video?.id) {
      logger.error(`FAILED: YouTube details incomplete for ${videoId}`, "syncService");
      throw new Error(`Video details not found or incomplete for ${videoId}`);
    }

    logger.info(`Successfully fetched: "${video.snippet.title}" from channel: "${video.snippet.channelTitle}"`, "syncService");

    const finalHasVeg = isVeg || (existingVideo?.hasVeg ?? false);

    const videoData: Partial<VideoInterface> = {
      videoId: video.id,
      videoTitle: video.snippet.title || "",
      videoDescription: video.snippet.description || undefined,
      channelId: video.snippet.channelId || undefined,
      channelTitle: video.snippet.channelTitle || undefined,
      publishedAt: video.snippet.publishedAt || undefined,
      thumbnail: {
        small: video.snippet.thumbnails?.medium?.url || undefined,
        // Highest available, in descending order. `standard` (640x480) was previously
        // skipped, so a video without a maxres thumbnail fell straight to high (480x360).
        // YouTube thumbnails are referenced as i.ytimg.com URLs and never stored, so
        // preferring larger variants costs nothing.
        large:
          video.snippet.thumbnails?.maxres?.url ||
          video.snippet.thumbnails?.standard?.url ||
          video.snippet.thumbnails?.high?.url ||
          undefined,
      },
      hasVeg: finalHasVeg,
    };

    logger.debug(`Extracting location details from description for: ${videoId}`, "syncService");
    const locations = await fetchLocationDetails(video.snippet.description);
    logger.info(`Locations found for ${videoId}: ${locations.length}`, "syncService");

    // Record the video before deciding whether it yielded any places.
    //
    // A video whose description carries no resolvable Maps link has still been fully
    // processed, and persisting it is what makes this idempotent: previously the early
    // return below happened first, so such a video was never written, stayed permanently
    // `isSynced: false` in the /sync UI, and burned a fresh YouTube quota unit plus the
    // redirect-tracing and Places lookups on every subsequent "Sync Current Page".
    // If a description later gains a Maps link, a hard sync picks it up.
    await Video.findOneAndUpdate({ videoId: video.id }, videoData, { upsert: true });

    if (locations.length === 0) {
      logger.info(`SKIPPED: No locations found for video ${videoId}`, "syncService");
      // Resolving to nothing is a complete outcome, so stamp it. Without this, a video with
      // no Maps link would look identical to one whose places failed to save and would be
      // retried on every subsequent sync.
      await markPlacesResolved(video.id);
      return { status: "skipped", message: "No locations found" };
    }

    // Any place that fails to save leaves this video incomplete, which withholds the
    // resolution stamp so the next soft sync picks it up again.
    let placeFailures = 0;

    for (const loc of locations) {
      if (!loc.place_id) {
        logger.warn(`Skipping location with no place_id: ${loc.name}`, "syncService");
        continue;
      }

      if (loc.business_status === "CLOSED_PERMANENTLY") {
        logger.info(`SKIPPING: ${loc.name} is CLOSED_PERMANENTLY.`, "syncService");
        continue;
      }

      if (loc.rating === undefined || loc.rating === null) {
        logger.info(`SKIPPING: No rating/reviews found for ${loc.name} (${loc.place_id}).`, "syncService");
        continue;
      }

      logger.debug(`Processing location: ${loc.name} (${loc.place_id})`, "syncService");
      const photoRef = loc.photos?.[0]?.photo_reference;

      try {
        let placeDoc = await Place.findOne({ place_id: loc.place_id });
        let storedPhoto: StoredPhoto | undefined;

        // Only fetch the photo if we don't already have one in blob storage, or on a hard
        // sync. Keyed on `photoKey` rather than the legacy base64 field, because once that field
        // is cleaned up, keying on it would re-fetch every photo on every sync.
        if (photoRef && (!placeDoc || !placeDoc.photoKey || mode === "hard")) {
          logger.info(`Fetching photo for ${loc.name}${mode === "hard" ? " (Hard Sync)" : ""}`, "syncService");
          storedPhoto = await fetchAndStorePlacePhoto(loc.place_id, photoRef);
          if (storedPhoto) {
            await sleep(500); // Throttling
          }
        }

        const placeData: Partial<PlaceInterface> = {
          place_id: loc.place_id,
          name: loc.name,
          formatted_address: loc.formatted_address,
          geometry: loc.geometry as PlaceInterface["geometry"],
          international_phone_number: loc.international_phone_number,
          rating: loc.rating,
          user_ratings_total: loc.user_ratings_total,
          url: loc.url,
          opening_hours: loc.opening_hours as PlaceInterface["opening_hours"],
          business_status: loc.business_status,
          // NOTE: `slug` is deliberately absent. It is assigned once at creation and never
          // updated. A hard sync used to Object.assign a name-derived slug over the
          // existing one, silently changing the public URL of a live page whenever Google
          // edited the place name (breaking inbound links, the sitemap, and Disqus threads).
          thumbnail: videoData.thumbnail,
          hasVeg: finalHasVeg, // Ensure place gets the hasVeg status
          placePhotoReference: photoRef,
        };

        if (storedPhoto) {
          placeData.photoKey = storedPhoto.key;
          placeData.photoUrl = storedPhoto.url;
          placeData.photoUpdatedAt = new Date();
          placeData.photoAttribution = loc.photos?.[0]?.html_attributions ?? [];
        }

        if (placeDoc) {
          if (mode === "hard") {
            logger.info(`Updating existing Place data for: ${loc.name}`, "syncService");
            Object.assign(placeDoc, placeData);
          } else {
            // Even in soft sync, ensure hasVeg is updated if it's now true
            if (finalHasVeg) placeDoc.hasVeg = true;
            // Also update photo if missing
            if (storedPhoto && !placeDoc.photoKey) {
              placeDoc.photoKey = storedPhoto.key;
              placeDoc.photoUrl = storedPhoto.url;
              placeDoc.photoUpdatedAt = new Date();
              placeDoc.photoAttribution = loc.photos?.[0]?.html_attributions ?? [];
              placeDoc.placePhotoReference = photoRef;
            }
          }
          
          if (!placeDoc.videoIds.includes(videoId)) {
            placeDoc.videoIds.push(videoId);
          }
        } else {
          logger.info(`Creating NEW Place entry for: ${loc.name}`, "syncService");
          const slug = await buildUniqueSlug(loc.name || "", loc.place_id);
          placeDoc = new Place({ ...placeData, slug, videoIds: [videoId] });
        }

        await updatePlaceSearchContent(placeDoc);
        await placeDoc.save();

      } catch (placeErr) {
        placeFailures += 1;
        // Surface duplicate-key failures explicitly. These used to be swallowed as a
        // generic error, so a colliding place vanished from the database with no signal.
        const code = (placeErr as { code?: number })?.code;
        if (code === 11000) {
          logger.error(
            `DUPLICATE KEY: place ${loc.name} (${loc.place_id}) collided with an existing document and was NOT saved`,
            "syncService",
            placeErr
          );
        } else {
          logger.error(`Error saving place ${loc.name} for video ${videoId}`, "syncService", placeErr);
        }
      }
    }

    if (placeFailures > 0) {
      await markPlacesUnresolved(video.id);
      logger.warn(
        `SYNC INCOMPLETE for video ${videoId}: ${placeFailures} of ${locations.length} places failed to save. ` +
        `Leaving it unresolved so the next soft sync retries it.`,
        "syncService"
      );
      return { status: "partial", locationsFound: locations.length, placeFailures };
    }

    await markPlacesResolved(video.id);
    logger.info(`SYNC COMPLETE for video: ${videoId}`, "syncService");
    return { status: "success", locationsFound: locations.length };
  } catch (error: unknown) {
    logger.error(`SYNC FAILED for video: ${videoId}`, "syncService", error);
    throw error;
  }
};

/**
 * Resolves a *current* photo reference for a place.
 *
 * Photo references are not durable identifiers; Google rotates them. References stored on
 * existing documents return HTTP 400, so anything re-fetching an old photo must re-resolve
 * first. Verified directly: a stored reference returned 400 while a freshly fetched one for
 * the same place returned 200.
 *
 * Requests only the `photos` field to stay on the cheapest Place Details SKU.
 */
const fetchCurrentPhotoReference = async (
  placeId: string
): Promise<{ reference: string; attributions: string[] } | undefined> => {
  const response = await googleMapsClient.placeDetails({
    params: {
      place_id: placeId,
      fields: ["photos"],
      key: env.GOOGLE_MAPS_API_KEY,
    },
  });

  const photo = response.data.result?.photos?.[0];
  if (!photo?.photo_reference) return undefined;

  return {
    reference: photo.photo_reference,
    attributions: photo.html_attributions ?? [],
  };
};

/**
 * Migrates stored place photos from base64-in-MongoDB to blob storage, at high resolution.
 *
 * Batched and resumable: pass the returned `nextCursor` back in to continue. The stored
 * 480px bytes cannot be upscaled, so each photo is re-downloaded from Google, via a freshly
 * resolved reference, since the stored ones have expired.
 *
 * Non-destructive: a place that cannot be migrated keeps its existing base64 image and is
 * reported, never blanked. `noPhoto` counts places Google no longer returns any photo for,
 * which is a normal outcome rather than an error.
 */
export const backfillPlacePhotos = async (limit = 25, cursor?: string) => {
  await dbConnect();

  const pending = { photoKey: { $exists: false } };
  const query: Record<string, unknown> = { ...pending };
  if (cursor) query.place_id = { $gt: cursor };

  const places = await Place.find(query).sort({ place_id: 1 }).limit(limit);

  logger.info(`Backfill: processing ${places.length} places`, "syncService");

  let migrated = 0;
  let noPhoto = 0;
  let failed = 0;
  const failures: string[] = [];
  let lastPlaceId: string | undefined;

  for (const place of places) {
    lastPlaceId = place.place_id;
    try {
      const current = await fetchCurrentPhotoReference(place.place_id);
      if (!current) {
        noPhoto += 1;
        logger.info(`Backfill: Google returned no photo for ${place.place_id}`, "syncService");
        continue;
      }

      const stored = await fetchAndStorePlacePhoto(place.place_id, current.reference);
      if (!stored) {
        failed += 1;
        failures.push(place.place_id);
        continue;
      }

      place.photoKey = stored.key;
      place.photoUrl = stored.url;
      place.photoUpdatedAt = new Date();
      place.photoAttribution = current.attributions;
      place.placePhotoReference = current.reference;

      // Rebuild thumbnails so they point at the blob URL instead of the base64 blob.
      await updatePlaceSearchContent(place);
      await place.save();

      migrated += 1;
      await sleep(250); // be gentle with the Places API
    } catch (err) {
      failed += 1;
      failures.push(place.place_id);
      logger.error(`Backfill failed for ${place.place_id}`, "syncService", err);
    }
  }

  const remaining = await Place.countDocuments(pending);

  return {
    migrated,
    noPhoto,
    failed,
    failures,
    remaining,
    nextCursor: places.length === limit ? lastPlaceId : undefined,
    done: places.length < limit,
  };
};

/**
 * Reclaims database space by unsetting the legacy base64 field.
 *
 * Deliberately separate from the backfill and destructive: only run once the migrated
 * images have been confirmed to render. Only touches places that already have a photoKey.
 */
export const cleanupPlacePhotoBlobs = async () => {
  await dbConnect();

  const result = await Place.updateMany(
    { photoKey: { $exists: true }, placePhotoBase64: { $exists: true } },
    { $unset: { placePhotoBase64: "" } }
  );

  const remainingWithBase64 = await Place.countDocuments({
    placePhotoBase64: { $exists: true },
  });

  logger.info(
    `Cleanup: cleared base64 from ${result.modifiedCount} places, ${remainingWithBase64} still hold one`,
    "syncService"
  );

  return { cleared: result.modifiedCount, remainingWithBase64 };
};
