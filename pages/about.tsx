import React from "react";
import { Box, Grid, Container, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/router";

import ResponsiveDrawer from "../components/headers/Header";
import CustomAccordion from "../components/accordion/Accordion";
import { Seo } from "../components/seo/Seo";
import { JsonLd } from "../components/seo/JsonLd";
import {
  absoluteUrl,
  buildFaqJsonLd,
  getSiteUrl,
  JsonLd as JsonLdType,
} from "../lib/seo";
import { SITE_NAME, SITE_SHORT_NAME } from "../config/constants";

const faqs = [
  {
    qid: 1,
    title: "What is FLDb?",
    description:
      "Food Lovers Database (FLDb) is a specialized discovery platform that aggregates food reviews from popular YouTube vloggers like Food Lovers TV, FoodyMonk, and more. It organizes hundreds of reviews into a searchable, location-aware interface.",
  },
  {
    qid: 2,
    title: "What is the purpose of FLDb?",
    description:
      "FLDb bridges the gap between entertaining video content and actionable dining discovery. We extract location data from trusted food reviewers and enrich it with Google Maps details to help you find your next great meal.",
  },
  {
    qid: 3,
    title: "Who is the target audience for this site?",
    description:
      "Food enthusiasts and travelers who follow popular food vloggers and want a structured, geographic way to explore the restaurants featured in their videos.",
  },
  {
    qid: 4,
    title: "Why use FLDb instead of just browsing YouTube?",
    description:
      "While YouTube is great for entertainment, it isn't optimized for geographic discovery. FLDb provides location-based search, distance sorting, and dietary filters that make it easy to find recommendations 'near you' in real-time.",
  },
  {
    qid: 5,
    title: "Is FLDb owned or sponsored by these YouTube channels?",
    description:
      "No. FLDb is an independent fan-made project. We are not affiliated with, sponsored by, or endorsed by Food Lovers TV, FoodyMonk, or any other featured creators. We simply aim to make their incredible content more accessible to the community.",
  },
  {
    qid: 6,
    title: "Everything has a story behind it. What is the story behind FLDb?",
    description:
      "My friends and I travel throughout Karnataka quite frequently, and we all agreed that finding great food while on the road is surprisingly difficult. Initially, we thought about manually cataloging every popular restaurant—but we quickly realized we didn't have the time for that! Instead, I decided to build a tool that organizes content from my favorite YouTube channels like Food Lovers TV and FoodyMonk. I found it cumbersome to watch hours of video just to remember a restaurant's name or location, so FLDb was born to solve that exact problem for myself and fellow travelers.",
  },
  {
    qid: 7,
    title: "How does FLDb plan to make money?",
    description:
      "The plan is to not make money. You heard me right—this site is free to all and does not include any ads, paid promotions, or sponsorships. FLDb started as my hobby project, and I intend to keep it that way.",
  },
  {
    qid: 8,
    title: "How will FLDb sustain without making any money?",
    description:
      "This site depends on a bunch of free services offered by companies like Vercel, GitHub, and MongoDB. The only things that can't be obtained for free are the domain ownership and the Google Places API calls, which I am happy to bear myself as a personal contribution. I will continue to keep this site free from ads as long as it doesn't punch too big a hole in my pocket!",
  },
  {
    qid: 9,
    title: "How can I contribute to FLDb?",
    description:
      "Technical contributions are always welcome! You can report bugs, suggest new channels, or contribute code at https://github.com/Mr-SKR/FLDB. Helping spread the word through word-of-mouth is also a huge help.",
  },
  {
    qid: 10,
    title: "Is this site highly available or scalable?",
    description:
      "The site uses a serverless architecture designed for stability and responsiveness. While we don't guarantee 100% 'enterprise' uptime, it is more than capable of handling our community of food lovers efficiently.",
  },
  {
    qid: 11,
    title: "What is the tech stack used to build this application?",
    description:
      "FLDb is built using Next.js, TypeScript, MongoDB, and Material UI (MUI). It features a mobile-first design with a custom background synchronization engine.",
  },
  {
    qid: 12,
    title: "Is the source code available?",
    description:
      "Yes, the entire project is open-source under the MIT License. You can find it at https://github.com/Mr-SKR/FLDB. We encourage transparency and collaborative improvement.",
  },
  {
    qid: 13,
    title: "How is the distance to restaurants calculated?",
    description:
      "We use the Haversine formula to calculate the shortest distance (as-the-crow-flies) from your location to the restaurant. It's a reliable estimate for nearby discovery, though actual travel distance may vary.",
  },
  {
    qid: 14,
    title: "How does FLDb aggregate its data?",
    description:
      "Our synchronization engine periodically scans configured YouTube channels and playlists. It identifies Google Maps links in video descriptions and uses the Google Places API to retrieve accurate ratings, photos, and contact information.",
  },
  {
    qid: 15,
    title: "What does the 'Veg Friendly' label mean?",
    description:
      "Restaurants tagged as 'Veg Friendly' have documented vegetarian options. This includes both exclusively vegetarian (Pure Veg) establishments and those with significant vegetarian menu choices.",
  },
  {
    qid: 16,
    title: "What can I search for using the search bar?",
    description:
      "You can search by restaurant name, city, area, or even video title and description keywords. Our search is designed to help you find recommendations based on whatever details you remember.",
  },
];

interface AboutProps {
  canonical: string;
  jsonLd: JsonLdType;
}

function About({ canonical, jsonLd }: AboutProps): React.ReactElement {
  const router = useRouter();

  return (
    <React.Fragment>
      <Seo
        title={`About ${SITE_SHORT_NAME} — How Food Lovers Database Works`}
        description={
          `How ${SITE_NAME} turns food vlogs into a searchable restaurant directory: where the ` +
          `data comes from, how distances are calculated, and why the site is free and ad-free.`
        }
        canonical={canonical}
      />
      {/* The page is a genuine question-and-answer document, which is exactly what FAQPage
          markup describes — and it is the one page here eligible for FAQ rich results. */}
      <JsonLd data={jsonLd} />
      <ResponsiveDrawer showAbout={false} showThemeToggle={false} />
      <Container maxWidth="md" sx={{ mt: 3, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/")}
          sx={{ mb: 3, textTransform: "none", fontWeight: "bold" }}
        >
          Back to Home
        </Button>

        {/* This page had no h1 at all — only a flat list of accordion questions. */}
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, mb: 1, letterSpacing: -0.5 }}
        >
          About {SITE_NAME}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Frequently asked questions about {SITE_SHORT_NAME}, the data behind it, and how it
          is built.
        </Typography>
        <Box
          sx={{
            justfyContent: "center",
            padding: "0",
          }}
        >
          <Grid
            container
            spacing={2}
            sx={{ justifyContent: "center", marginBottom: "1rem" }}
          >
            {faqs.map((faq) => (
              <CustomAccordion
                key={faq.qid}
                qid={faq.qid}
                title={faq.title}
                description={faq.description}
              />
            ))}
          </Grid>
        </Box>
      </Container>
    </React.Fragment>
  );
}
export const getStaticProps = async () => {
  const siteUrl = getSiteUrl();
  return {
    props: {
      canonical: absoluteUrl(siteUrl, "/about"),
      jsonLd: buildFaqJsonLd(faqs),
    },
  };
};

export default About;
