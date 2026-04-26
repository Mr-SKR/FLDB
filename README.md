# Food Lovers Database (FLDb)

[![Website](https://img.shields.io/badge/Website-foodloversdatabase.com-blue)](https://foodloversdatabase.com)

A comprehensive collection and search engine for food vlogs from the [Food Lovers TV](https://www.youtube.com/channel/UC-Lq6oBPTgTXT_K-ylWL6hg) YouTube channel.

## 🍽️ About the Project

Food Lovers Database (FLDb) is a fan-made project designed to help food enthusiasts discover restaurants reviewed by Food Lovers TV. It bridges the gap between entertaining video content and actionable dining discovery by extracting location data directly from video descriptions and enriching it with Google Maps details.

This repository contains the integrated frontend and synchronization logic.

## ✨ Key Features

- 📍 **Location-Based Discovery:** Find restaurants near your current location.
- 🔍 **Powerful Search:** Search by restaurant name, or video title.
- 🌓 **Dark & Light Mode:** Fully responsive UI with persistent theme support.
- 🥗 **Dietary Filters:** Quickly filter for "Veg Friendly" restaurants.
- 🔄 **Automated Data Sync:** Integrated background synchronization with YouTube and Google Places APIs.
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

The database is populated by syncing with specific YouTube playlists.

**Trigger manually:**
```bash
curl -X POST "http://localhost:3000/api/sync?secret=YOUR_CUSTOM_SECRET"
```

**Automate:** Use [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) or GitHub Actions to trigger the sync endpoint periodically.

## 💻 Development

Run the development server:
```bash
yarn dev
```

Run linting:
```bash
yarn lint
```

## 📦 Project Structure

- `/components`: Reusable UI components (Cards, Filters, Headers).
- `/pages/api`: API routes, including the `/sync` logic.
- `/services`: Business logic for video and data management.
- `/lib`: Helper libraries for DB connection and location extraction.
- `/models`: Mongoose schemas for MongoDB.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Created with ❤️ for the Food Lovers community.*
