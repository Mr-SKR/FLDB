import { configureStore } from "@reduxjs/toolkit";
import videoReducer from "./features/video/videoSlice";

export const store = configureStore({
  reducer: {
    videos: videoReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {videos: VideosState}
export type AppDispatch = typeof store.dispatch;
