import React from "react";
import { Box, Grid, Container } from "@mui/material";
import Head from "next/head";

import ResponsiveDrawer from "../components/headers/Header";
import CustomAccordion from "../components/accordion/accordion";

const faqs = [
  {
    qid: 1,
    title: "What is FLDb?",
    description:
      "Food Lovers Database(FLDb) is a collection of food Vlogs from Food Lovers TV (https://www.youtube.com/channel/UC-Lq6oBPTgTXT_K-ylWL6hg)",
  },
  {
    qid: 2,
    title: "What is purpose of FLDb?",
    description:
      "FLDb serves the same purpose for Food Lovers TV followers as that of IMDb.com for movie followers.",
  },
  {
    qid: 3,
    title: "Who are the targetted audience of this site?",
    description:
      "Fellow Bengalurians and people living/travelling around Karnataka as most of the Food Lovers TV Vlogs are from this region",
  },
  {
    qid: 4,
    title:
      "Why not just use the Youtube channel of Food Lovers TV to browse through things?",
    description:
      "Finding videos on YouTube is cumbersome and there is no easy way to search for Food Lovers TV reviewed restaurants near you. FLDb exists to help you overcome these issues",
  },
  {
    qid: 5,
    title: "Is FLDb owned or sponsored by Kripal Amanna/Food Lovers TV",
    description:
      "Nope. Although, the name is inspired from the youtube channel",
  },
  {
    qid: 6,
    title: "Everything has a story behind it. What is the story behind FLDb?",
    description:
      "My friends and I travel throughout Karnataka quite frequently and we all agree to the point that finding good food/restaurants while travelling is not an easy task. So we started gathering information of all the popular restaurants throughout Karnataka. JK, We don't have time for that. So we chose a popular YouTube channel that reviews food from popular restaurants from all over Karnataka and we found content from Food Lovers TV to meet our needs. We quickly realized that it is not an easy task to watch all those videos, remember the restaurants and the places they are situated in. Hence, FLDb came into existence",
  },
  {
    qid: 7,
    title: "How does FLDb plan to make money?",
    description:
      "The plan is to not make money. You heard me right, this site is free to all and does not include any ads, paid promotions or sponsorship. This site is a result of what started as my hobby project",
  },
  {
    qid: 8,
    title: "How will FLDb sustain without making any money?",
    description:
      "This site depends on a bunch of free services offered by companies like Render.com, Netlify.com, GitHub.com and MongoDB.com. The only things that can't be obtained for free is the domain ownership and a bunch of API calls made to Google Places API which I am ready to bear myself. I will continue to keep this site free from ads, promotions, sponsorships etc., as long as it doesn't punch a hole in my pocket",
  },
  {
    qid: 9,
    title: "How can I contribute to FLDb?",
    description:
      "While financial contributions are not encouraged, you can always contribute from technical point of view by submitting feature requests, bug report, code contribution etc., @ https://github.com/Mr-SKR/FLDB/issues or marketing by spreading the existence of this site by word of mouth. I'd genuinely feel happy if somebody recommends this site to me someday through the power of the word of mouth",
  },
  {
    qid: 10,
    title: "Is this site highly available or scalable?",
    description:
      "Nope. This site depends on a bunch of free services offered by companies like Render.com, Netlify.com, GitHub.com and MongoDB.com. These free services can't guarantee high availability and scalability. Since I do not expect a high amount of traffic flowing to this site, this site should manage just fine. My load testing results say that 30 concurrent users can use this site without facing any issues",
  },
  {
    qid: 11,
    title: "What is the tech stack used to build this application?",
    description:
      "Next.js, MongoDB, and MUI. The application is a self-contained Next.js project where both the frontend and backend logic (API routes/Server-side fetching) are co-located. Please raise issues @ https://github.com/Mr-SKR/FLDB/issues",
  },
  {
    qid: 12,
    title: "How can I trust this website?",
    description:
      "The source code for this entire application is publicly available @ https://github.com/Mr-SKR/FLDB. Feel free to inspect it. The code is licensed under MIT, so you are free to re-use it to build similar sites.",
  },
  {
    qid: 13,
    title: "Nearby page is displaying inaccurate distance",
    description:
      "The displacement shown is the shortest distance from your initial position to the restaurant (Imagine a straight line). It is calculated using the Haversine formula, which is accurate for most use cases but may vary slightly due to the earth's curvature.",
  },
  {
    qid: 14,
    title:
      "How does FLDb display information such as restaurant's ratings, contact number etc.?",
    description:
      "FLDb periodically gathers video information and Google Maps links from the YouTube channel using the YouTube Data API. These links are then used to fetch details like ratings, contact info, and operating hours via the Google Places API. This data is stored and served directly from our integrated backend.",
  },
  {
    qid: 15,
    title: "Are veg friendly labelled restaurants pure veg?",
    description:
      "No. These are the restaurants that have vegetarian options in the menu. They might or might not be pure vegetarian restaurants",
  },
  {
    qid: 16,
    title: "What all can I search using the searchbar in homepage?",
    description:
      "Searchbar in homepage can be used to search for video title which in most cases includes restaurant name and location information. So you can search for video title, restaurant name or place if you remember any of these keywords partially",
  },
];

function About(): JSX.Element {
  return (
    <React.Fragment>
      <Head>
        <title>About FLDb</title>
        <meta
          name="description"
          content="About Food Lovers Database (FLDb)"
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      <Box
        component={Container}
        sx={{
          maxWidth: "720px",
          justfyContent: "center",
          padding: "0",
          marginTop: "2rem",
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
    </React.Fragment>
  );
}
export default About;
