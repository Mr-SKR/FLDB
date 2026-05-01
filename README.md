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
- 🌓 **Dark & Light Mode:** Fully responsive UI with persistent theme support.
- 🥗 **Dietary Filters:** Quickly filter for "Veg Friendly" restaurants.
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

# Database Sync Configuration
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SYNC_SECRET=your_custom_secure_string_for_api_trigger
```

## 🔄 Database Syncing

The database is populated by a multi-step synchronization process that interfaces with the YouTube Data API and Google Places API. The system supports multiple channels and playlists as defined in `config/syncConfig.ts`.

### 🛡️ Authorization
All sync requests must be authorized using the `SYNC_SECRET` defined in your environment variables. You can provide this in two ways:
- **Header:** `Authorization: Bearer YOUR_SYNC_SECRET`
- **Query Parameter:** `?secret=YOUR_SYNC_SECRET`

### 🛠️ API Actions

The `/api/sync` endpoint supports the following actions:

#### 1. Get Sources
Retrieve the list of configured channels and playlists.
```bash
curl "http://localhost:3000/api/sync?action=get-sources&secret=YOUR_SECRET"
```

#### 2. List Videos
Fetch a paginated list of videos from a specific YouTube playlist.
```bash
curl "http://localhost:3000/api/sync?action=list&playlistId=PLAYLIST_ID&secret=YOUR_SECRET"
```

#### 3. Sync Individual Video
Trigger a deep sync for a specific video. This extracts location data and enriches it via the Google Places API.
- `mode`: `soft` (updates existing metadata) or `hard` (re-fetches everything from Google Places)
- `isVeg`: `true` or `false` (manual override for dietary filtering)

```bash
curl -X POST "http://localhost:3000/api/sync?action=sync&videoId=VIDEO_ID&mode=soft&isVeg=true&secret=YOUR_SECRET"
```

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
2. Enter your `SYNC_SECRET` in the "Sync Secret" field.
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
