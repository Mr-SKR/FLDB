[![Build Status](https://api.netlify.com/api/v1/badges/70ee4bbe-c76d-455f-a5c6-c26023d739cd/deploy-status)](https://app.netlify.com/sites/fl-db/deploys)

# Food loveers Database (FLDb)

Webiste: [FLDb](https://fl-db.in)

## About

Food Lovers Database(FLDb) is a collection of food Vlogs from [Food Lovers TV](https://www.youtube.com/channel/UC-Lq6oBPTgTXT_K-ylWL6hg)

This repo contains code related to frontend that serves that uses APIs from backend [FLDB backend](https://github.com/Mr-SKR/fldb-apis). More info: https://fl-db.in/about

## Features

- Find restaurants based on your location
- Find restaurants based on search results
- Find restaurant information such as video review, google ratings, contact number, location name, maps link, operating hours and description
- Comment and discuss on restaurant/video review of each restaurant

## Tech Stack (Front-end only)

- [React](https://reactjs.org/): Front-end library
- [TypeScript](https://www.typescriptlang.org/): Programming language
- [NextJS](https://nextjs.org/): Production ready react framework for SSR, SSG et.,
- [MUI](https://mui.com/): Design library

## Project Setup

### Install project dependencies

Install [Node.js](https://nodejs.org/en/) if you haven't already.
From the root of the project folder, execute below command(s)

```
npm install -g yarn
yarn
```

### Set environment variables

Create a `.env` file at the root of the project folder and populate appropriate values for below keys.

```
MONGODB_URI=<YOUR_MONGODB_URI>
NEXT_PUBLIC_DISQUS_SHORTNAME=<YOUR_DISQUS_SHORTNAME>

# For Database Sync
YOUTUBE_API_KEY=<YOUR_YOUTUBE_API_KEY>
GOOGLE_MAPS_API_KEY=<YOUR_GOOGLE_MAPS_API_KEY>
SYNC_SECRET=<YOUR_CUSTOM_SECRET_STRING>
```

### Database Syncing

The application now includes an integrated database sync logic. To trigger a refresh of the database with new videos and restaurant details, make a POST request to `/api/sync` with your `SYNC_SECRET`.

**Example:**
`curl -X POST "https://your-domain.com/api/sync?secret=YOUR_CUSTOM_SECRET_STRING"`

You can automate this using [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).

### Run locally

From the root of the project folder, execute below command(s)

```
yarn start
```

### Debugging on remote mobile firefox:

- [Firefox debug over network](https://developer.mozilla.org/en-US/docs/Tools/about:debugging#connecting_over_the_network)

### Setup monitoring using New Relic (optional)

This project uses [New Relic](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/introduction-browser-monitoring/) to setup browser monitoring of the users. You can setup the same if you wish
