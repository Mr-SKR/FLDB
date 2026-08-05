# Food Lovers Database (FLDb)

[![Website](https://img.shields.io/badge/Website-foodloversdatabase.com-blue)](https://foodloversdatabase.com)

A comprehensive collection and search engine for food vlogs from popular creators like [Food Lovers TV](https://www.youtube.com/channel/UC-Lq6oBPTgTXT_K-ylWL6hg), [FoodyMonk](https://www.youtube.com/channel/UCco04pGIpOtfHePXG5MnB9g), and more.

## 🍽️ About the Project

Food Lovers Database (FLDb) is a fan-made project designed to help food enthusiasts discover restaurants reviewed by their favorite food vloggers. It bridges the gap between entertaining video content and actionable dining discovery by extracting location data directly from video descriptions and enriching it with Google Maps details.

What started as a directory for Food Lovers TV has evolved into a multi-channel platform, aggregating trusted recommendations from across the food vlogging community into a single, location-aware interface.

This repository contains the integrated frontend and synchronization logic.

## ✨ Key Features

- 📍 **Location-Based Discovery:** Find restaurants near your current location across multiple creators.
- 🔍 **Powerful Search:** Search by restaurant name, location, or video title.
- 🎚️ **Sorting & Filters:** Order by nearest, top rated or A-to-Z, and narrow by minimum rating or "Veg Friendly". Every panel reports how many places actually match.
- 🕒 **Open Right Now:** Opening hours are parsed into a schedule, so each place says whether it is open and when it closes.
- 🌓 **Dark & Light Mode:** Fully responsive UI with persistent theme support.
- 🔄 **Automated Data Sync:** Integrated background synchronization with YouTube and Google Places APIs for multiple channels.
- 💬 **Discussion Integration:** Comment and discuss reviews via Disqus.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [MUI (Material UI)](https://mui.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) (Mongoose)
- **APIs:** YouTube Data API v3, Google Places API

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [Yarn](https://yarnpkg.com/)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster or local instance.

### 2. Installation

```bash
git clone https://github.com/Mr-SKR/FLDB.git
cd FLDB
yarn install
```

### 3. Google API Setup

You need a [Google Cloud Project](https://console.cloud.google.com/) with the following APIs enabled:
- YouTube Data API v3
- Maps JavaScript API
- Places API (requires billing enabled)

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_DISQUS_SHORTNAME=your_disqus_shortname

# Optional: canonical public origin, used for canonical tags, Open Graph URLs,
# the sitemap and Disqus thread URLs.
# Defaults to https://foodloversdatabase.com when unset.
#
# The legacy name `HOST` is still read as a fallback, but prefer this one: many Node
# hosts set HOST to the bind address, and a HOST=0.0.0.0 would silently rewrite every
# canonical URL on the site.
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Database Sync Configuration
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SYNC_SECRET=your_custom_secure_string_for_api_trigger

# Vercel Blob (place photo storage).
# Set automatically in Vercel once a Blob store is linked to the project;
# only needed here if you run a sync or backfill locally.
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token
```

Only `MONGODB_URI` is required to render the public site. The three sync variables are
validated lazily, on first use, so a preview deployment that never runs a sync does not need
Google credentials.

### 5. MongoDB Atlas Search Index (required for search)

The `/api/search` endpoint uses an Atlas Search `$search` stage, which depends on a search
index that is **not** created by the application. Without it, search requests fail.

In Atlas → your cluster → **Atlas Search** → *Create Search Index*, create a **dynamic** index
on the `places` collection named exactly `default`:

```json
{
  "mappings": { "dynamic": true }
}
```

The indexed fields used by the query are `name`, `formatted_address`, and `searchContent`.

## 🔄 Database Syncing

The database is populated by a multi-step synchronization process that interfaces with the YouTube Data API and Google Places API. The system supports multiple channels and playlists as defined in `config/syncConfig.ts`.

### 🛡️ Authorization
> ### ⚠️ `SYNC_SECRET` is deliberately NOT set on the production deployment
>
> Syncing is run **locally**, against the production database. Because the deployed app has
> no `SYNC_SECRET`, `/api/sync` returns `503` for every action, before authentication and
> before any Google-touching code runs. The deployed site therefore **cannot consume Google
> API quota**; the only Google calls ever made are the ones you trigger yourself from your
> machine.
>
> If you ever automate syncing (a Vercel Cron picking up new videos, for example) you would
> have to set `SYNC_SECRET` in the deployment, and at that point its strength matters a
> great deal, since it becomes the only thing protecting an endpoint that spends your Google
> budget and writes to your database. Generate a strong one:
>
> ```bash
> openssl rand -base64 32
> ```
>
> The endpoint refuses to run in production with a secret shorter than 16 characters.
>
> Independently of the code, cap the blast radius in Google Cloud Console:
> **APIs & Services → your API → Quotas** (a few thousand requests/day is far more than a
> manual sync needs), plus a billing budget alert. That bounds the cost regardless of any
> bug or misconfiguration.

All sync requests must be authorized using the `SYNC_SECRET` defined in your environment variables. For security, authorization is strictly handled via headers to avoid leaking secrets in server logs or browser history.
- **Header:** `Authorization: Bearer YOUR_SYNC_SECRET`
- The secret is compared in constant time, and the endpoint is rate limited per IP (both before and after authentication). Note that the limiter is in-memory, so on serverless platforms it is per-instance and best-effort. Use Vercel Firewall rules or an external counter if you need a hard global limit.

The public `/api/search` endpoint is rate limited on the same mechanism (60 requests per minute
per IP), which is far above real use (a debounced search is one request and infinite scroll
adds one per page), but it bounds the only endpoint an anonymous caller can drive.

Client IPs are resolved from `x-vercel-forwarded-for` / `x-real-ip`, falling back to the *last*
entry of `x-forwarded-for`. The first entry is deliberately not used: it is whatever the client
sent, so keying on it would let a caller bypass the limiter with a spoofed header.

### 🔁 Methods

Read-only actions (`list`, `get-sources`) accept `GET`. The `sync` action mutates state and **requires `POST`**.

### 🛠️ API Actions

The `/api/sync` endpoint supports the following actions:

#### 1. Get Sources
Retrieve the list of configured channels and playlists.
```bash
curl -H "Authorization: Bearer YOUR_SECRET" "http://localhost:3000/api/sync?action=get-sources"
```

#### 2. List Videos
Fetch a page of videos from a specific YouTube playlist. `playlistId` is required. One
request returns one page of 50, along with `nextPageToken`/`prevPageToken` to page with.
```bash
curl -H "Authorization: Bearer YOUR_SECRET" "http://localhost:3000/api/sync?action=list&playlistId=PLAYLIST_ID"
```

#### 3. Sync Individual Video
Trigger a deep sync for a specific video. This extracts location data and enriches it via the Google Places API.
- `mode`: `soft` (updates existing metadata) or `hard` (re-fetches everything from Google Places)
- `isVeg`: `true` or `false` (manual override for dietary filtering)

```bash
curl -X POST -H "Authorization: Bearer YOUR_SECRET" "http://localhost:3000/api/sync?action=sync&videoId=VIDEO_ID&mode=soft&isVeg=true"
```

Returns `status: "success"` when the video and all of its places were saved,
`"skipped"` when there was nothing to do, or `"partial"` when some places failed. A
partial video is deliberately left unmarked so the next soft sync retries it, rather
than being recorded as done with its restaurants missing.

## 🖼️ Place Photo Storage

Place photos are stored in **Vercel Blob**, not in MongoDB. Each place keeps only a stable
key (`places/<place_id>.webp`) and its public URL; the image itself is a 1600px WebP.

Photos were previously inlined into the documents as base64 data URLs. Because the same
string was written to five fields per place, that cost roughly 255 KB per place (~155 MB
across the database) and forced a 480px resolution cap to fit the free tier.

Images are rendered through `next/image`, which puts Vercel's image cache in front of the
blob store. If a place photo ever fails to load, the card falls back to the YouTube
thumbnail rather than showing a broken image.

### Backfill

Migrating existing places re-fetches each photo from Google at the new resolution, because the
stored 480px bytes cannot be upscaled. The endpoint is batched and resumable:

```bash
# Returns { migrated, failed, failures, remaining, nextCursor, done }
curl -X POST -H "Authorization: Bearer YOUR_SECRET" \
  "http://localhost:3000/api/sync?action=backfill-photos&limit=25"

# Continue from where it stopped
curl -X POST -H "Authorization: Bearer YOUR_SECRET" \
  "http://localhost:3000/api/sync?action=backfill-photos&limit=25&cursor=PLACE_ID"
```

Places whose `photoReference` has expired keep their existing image and are listed in
`failures`; recover those with a hard sync of the relevant video.

Once you have confirmed the migrated images render correctly, reclaim the database space.
**This is destructive and irreversible.** It drops the legacy base64 field:

```bash
curl -X POST -H "Authorization: Bearer YOUR_SECRET" \
  "http://localhost:3000/api/sync?action=cleanup-photo-blobs"
```

### When synced data appears on the live site

Pages are served via ISR and revalidate **hourly** (`/` and `/place/[slug]`). Because syncing
runs locally against the production database, the deployment never learns that data changed,
and on-demand revalidation can't help, since calling it from your machine invalidates your
local cache rather than the deployment's. The revalidate timer is therefore the mechanism by
which a sync becomes visible in production.

Two things soften this in practice:

- `/api/search` is a dynamic route querying MongoDB live, so browsing, searching, and
  location-sorted results are **always fresh** regardless of ISR.
- New places get their page generated on first request (`fallback: "blocking"`), so they don't
  wait for a revalidation window. It blocks rather than serving a skeleton because the first
  request for a newly synced restaurant is very often a crawler, which would otherwise index
  a loading state.

If you want a sync reflected immediately, trigger a **Vercel Deploy Hook** after running it;
a rebuild regenerates every page from current data.

## 🖥️ Sync Management Interface

For easier management, FLDb includes a built-in admin dashboard located at `/sync`. This interface provides a visual way to manage the database without manually using `curl`.

### Features:
- **Source Selection:** Choose from multiple configured channels and playlists (e.g., Food Lovers TV, FoodyMonk).
- **Video Discovery:** Fetch the latest videos from the selected YouTube playlist.
- **Smart Filtering:** Automatically identifies which videos have already been synced to the database.
- **Bulk Operations:** Trigger a "Sync Current Page" action to process all unsynced videos in one go.
- **Granular Control:**
    - **Soft Sync:** Updates existing restaurant data (useful for minor metadata refreshes).
    - **Hard Sync:** Performs a complete re-fetch from the Google Places API (useful if restaurant details like rating or location have changed significantly).

### How to use:
1. Navigate to `https://foodloversdatabase.com/sync` (or `localhost:3000/sync`).
2. Enter your `SYNC_SECRET` in the "Sync Secret" field, then click away (or press Tab) to connect. The field only contacts the API once you leave it, so partial secrets are never sent.
3. Select a target channel/playlist.
4. Click **Load Playlist** to see the latest videos.
5. Use the sync buttons on individual videos or the "Sync Current Page" button for bulk updates.

## 🤖 Automation
For production environments, the sync logic can be automated using **GitHub Actions** or **Vercel Cron Jobs** to periodically refresh the restaurant database by hitting the API endpoints described above.

## 💻 Development

### Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `yarn dev` | Launches the local development server with HMR. |
| **Build Project** | `yarn build` | Compiles the production-ready application. |
| **Start Production** | `yarn start` | Runs the compiled production build locally. |
| **Linting** | `yarn lint` | Runs ESLint to check for code quality and style issues. |
| **Type-Check** | `yarn typecheck` | Runs the TypeScript compiler to verify type safety. |

## 📦 Project Structure

- **`/components`**: Reusable UI components including layout elements, cards, and specialized discovery UI.
- **`/config`**: Global constants and synchronization source configurations.
- **`/hooks`**: Custom React hooks for geolocation handling and place filtering logic.
- **`/lib`**: Core libraries for database connectivity, environment management, and location enrichment.
- **`/models`**: Mongoose schemas defining the data structures for Restaurants (Places) and Videos.
- **`/pages`**: Next.js pages and API routes (including the search and sync engines).
- **`/services`**: Business logic for data orchestration and third-party API interactions.
- **`/types`**: TypeScript interface and type definitions used across the application.
- **`/utils`**: Helper functions for geographic calculations, slugification, and data serialization.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Created with ❤️ for the Food Lovers community.*
