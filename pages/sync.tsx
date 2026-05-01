import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  Avatar,
  Chip,
  LinearProgress,
  Grid,
} from "@mui/material";
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
  PlayArrow as PlayArrowIcon,
} from "@mui/icons-material";
import ResponsiveDrawer from "../components/headers/Header";
import Head from "next/head";

interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  isVeg: boolean;
  isSynced: boolean;
  syncStatus?: "idle" | "loading" | "success" | "error";
  error?: string;
}

const SyncPage = () => {
  const [secret, setSecret] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingList, setLoadingList] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const fetchVideoList = async (token?: string) => {
    if (!secret) {
      setGlobalError("Please enter the sync secret first.");
      return;
    }
    setLoadingList(true);
    setGlobalError("");
    try {
      const url = `/api/sync?action=list${token ? `&pageToken=${token}` : ""}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch list");
      const data = await res.json();
      setVideos(data.videos.map((v: VideoItem) => ({ ...v, syncStatus: "idle" })));
      setNextPageToken(data.nextPageToken);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingList(false);
    }
  };

  const handleSyncVideo = async (videoId: string, mode: "soft" | "hard", isVeg: boolean) => {
    setVideos(prev => prev.map(v => v.videoId === videoId ? { ...v, syncStatus: "loading" } : v));
    
    try {
      const res = await fetch(
        `/api/sync?action=sync&videoId=${videoId}&mode=${mode}&isVeg=${isVeg}`,
        {
          headers: {
            "Authorization": `Bearer ${secret}`
          }
        }
      );
      const data = await res.json();

      if (res.ok) {
        setVideos(prev => prev.map(v => 
          v.videoId === videoId ? { ...v, syncStatus: "success", isSynced: true } : v
        ));
        return true;
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (err: unknown) {
      setVideos(prev => prev.map(v => 
        v.videoId === videoId ? { 
          ...v, 
          syncStatus: "error", 
          error: err instanceof Error ? err.message : "Sync failed" 
        } : v
      ));
      return false;
    }
  };

  const handleSyncAll = async () => {
    const unsyncedVideos = videos.filter(v => !v.isSynced);
    if (unsyncedVideos.length === 0) {
      setGlobalError("No unsynced videos to process.");
      return;
    }

    setSyncingAll(true);
    setGlobalError("");

    for (const video of unsyncedVideos) {
      const success = await handleSyncVideo(video.videoId, "soft", video.isVeg);
      if (!success) {
        console.error(`Failed to sync ${video.videoId}`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSyncingAll(false);
  };

  const syncedCount = videos.filter(v => v.isSynced).length;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Head>
        <title>Admin: Curated Sync | FLDb</title>
      </Head>
      <ResponsiveDrawer />

      <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 8 }, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: "16px" }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} sx={{ flexDirection: { xs: "column", sm: "row" }, gap: 2, textAlign: { xs: "center", sm: "left" } }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CloudDownloadIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">Curated Sync</Typography>
            </Box>
            {videos.length > 0 && (
              <Chip 
                label={`Page Sync: ${syncedCount} / ${videos.length}`} 
                color="primary" 
                variant="outlined" 
                sx={{ fontWeight: "bold", py: 2 }}
              />
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={4}>
            Fetch the latest videos from YouTube playlists (50 at a time) and choose which ones to sync.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="medium"
                label="Sync Secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => fetchVideoList()}
                disabled={loadingList || syncingAll}
                sx={{ height: "100%", py: { xs: 1.5, sm: 0 } }}
                startIcon={loadingList ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              >
                Load First Page
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleSyncAll}
                disabled={loadingList || syncingAll || videos.length === 0}
                sx={{ height: "100%", py: { xs: 1.5, sm: 0 } }}
                startIcon={syncingAll ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              >
                Sync Current Page
              </Button>
            </Grid>
          </Grid>

          {syncingAll && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Processing unsynced videos on this page...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {globalError && <Alert severity="error" sx={{ mb: 3 }}>{globalError}</Alert>}

          <Divider sx={{ mb: 2 }} />

          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {videos.length === 0 && !loadingList && (
              <Box textAlign="center" py={4} color="text.disabled">
                No videos loaded. Enter secret and click &quot;Load First Page&quot;.
              </Box>
            )}
            
            {videos.map((video) => (
              <ListItem
                key={video.videoId}
                divider
                sx={{ 
                  flexDirection: "column", 
                  alignItems: "stretch",
                  gap: 2,
                  py: 2,
                  bgcolor: video.isSynced ? "action.hover" : "transparent",
                  px: { xs: 1, sm: 2 }
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Avatar 
                    variant="rounded" 
                    src={video.thumbnail} 
                    sx={{ width: 80, height: 60, border: video.isSynced ? "2px solid #4caf50" : "none" }} 
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
                      <Typography variant="body1" fontWeight={video.isSynced ? "normal" : "bold"} sx={{ lineHeight: 1.2 }}>
                        {video.title}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      {video.isVeg && <Chip label="Veg" size="small" color="success" variant="outlined" />}
                      {video.isSynced && (
                        <Chip 
                          icon={<CheckCircleIcon />} 
                          label="Synced" 
                          size="small" 
                          color="success" 
                        />
                      )}
                    </Box>
                    {video.syncStatus === "success" && (
                      <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1 }}>
                        Recently updated!
                      </Typography>
                    )}
                    {video.syncStatus === "error" && (
                      <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                        Error: {video.error}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={video.syncStatus === "loading" || syncingAll}
                    onClick={() => handleSyncVideo(video.videoId, "soft", video.isVeg)}
                    sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: "110px" }}
                    startIcon={video.syncStatus === "loading" ? <CircularProgress size={16} /> : <SyncIcon />}
                  >
                    Soft Sync
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    disabled={video.syncStatus === "loading" || syncingAll}
                    onClick={() => handleSyncVideo(video.videoId, "hard", video.isVeg)}
                    sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: "110px" }}
                  >
                    Hard Sync
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>

          {nextPageToken && !loadingList && (
            <Box mt={4} textAlign="center">
              <Button
                variant="outlined"
                onClick={() => fetchVideoList(nextPageToken)}
                disabled={syncingAll}
                startIcon={<CloudDownloadIcon />}
              >
                Load Next Page (50 more)
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default SyncPage;
