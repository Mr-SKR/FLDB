import { createSlice } from "@reduxjs/toolkit";
import { PAGE_SIZE } from "../../config/constants";

export const videoSlice = createSlice({
  name: "video",
  initialState: {
    videos: [],
    currentVideos: [],
    currentPageVideos: [],
    currentPage: 0,
  },
  reducers: {
    setVideos: (state, action) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.videos = action.payload;
    },
    setCurrentVideos: (state, action) => {
      state.currentVideos = action.payload;
    },
    setCurrentPageVideos: (state, action) => {
      state.currentPageVideos = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    nextPage: (state) => {
      state.currentPageVideos = state.currentVideos.slice(
        (state.currentPage + 1) * PAGE_SIZE,
        (state.currentPage + 2) * PAGE_SIZE
      );
      state.currentPage = state.currentPage + 1;
    },
    prevPage: (state) => {
      state.currentPageVideos = state.currentVideos.slice(
        (state.currentPage - 1) * PAGE_SIZE,
        state.currentPage * PAGE_SIZE
      );
      state.currentPage = state.currentPage - 1;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setVideos,
  setCurrentVideos,
  setCurrentPageVideos,
  setCurrentPage,
  nextPage,
  prevPage,
} = videoSlice.actions;

export default videoSlice.reducer;
