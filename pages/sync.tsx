import React, { useState, useCallback } from "react";
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
  PlayArrow as PlayArrowIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ResponsiveDrawer from "../components/headers/Header";
import Head from "next/head";
import { logger } from "../lib/logger";

interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  isVeg: boolean;
  isSynced: boolean;
  channelTitle?: string;
  channelId?: string;
  syncStatus?: "idle" | "loading" | "success" | "error";
  error?: string;
}

interface PlaylistSource {
  channelId: string;
  channelTitle: string;
  playlists: { id: string, isVeg: boolean, name: string }[];
}

const SyncPage = () => {
  const [secret, setSecret] = useState("");
  const [sources, setSources] = useState<PlaylistSource[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>(undefined);
  const [loadingList, setLoadingList] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [sourcesStatus, setSourcesStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  /**
   * Loads the configured channels/playlists.
   *
   * Deliberately NOT wired to a `useEffect` on `secret`: that fired one request per
   * keystroke, sending every prefix of the secret to the server as a Bearer token and
   * logging each as an unauthorized attempt. Callers trigger this explicitly instead.
   */
  const fetchSources = useCallback(async (): Promise<PlaylistSource[]> => {
    if (!secret) return [];
    setSourcesStatus("loading");
    try {
      const res = await fetch(`/api/sync?action=get-sources`, {
        headers: { "Authorization": `Bearer ${secret}` }
      });

      if (!res.ok) {
        setSources([]);
        setSourcesStatus("error");
        setGlobalError(
          res.status === 401
            ? "Invalid sync secret."
            : `Could not load sources (HTTP ${res.status}).`
        );
        return [];
      }

      const data: PlaylistSource[] = await res.json();
      setSources(data);
      setSourcesStatus("ready");
      setGlobalError("");
      if (data.length > 0 && data[0].playlists.length > 0) {
        setSelectedPlaylist((prev) => prev || data[0].playlists[0].id);
      }
      return data;
    } catch (err) {
      logger.error("Failed to fetch sources", "SyncPage", err);
      setSourcesStatus("error");
      setGlobalError("Could not reach the sync API.");
      return [];
    }
  }, [secret]);

  const fetchVideoList = async (token?: string) => {
    if (!secret) {
      setGlobalError("Please enter the sync secret first.");
      return;
    }

    // Never call the list endpoint without a playlist id: the server would walk every
    // configured playlist to exhaustion.
    let playlistId = selectedPlaylist;
    if (!playlistId) {
      const loaded = await fetchSources();
      playlistId = loaded[0]?.playlists[0]?.id ?? "";
      if (!playlistId) {
        setGlobalError("No playlists available. Check the sync secret.");
        return;
      }
    }

    setLoadingList(true);
    setGlobalError("");
    try {
      const url = `/api/sync?action=list${token ? `&pageToken=${token}` : ""}&playlistId=${playlistId}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${secret}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch list");
      const data = await res.json();
      const mappedVideos = data.videos.map((v: VideoItem) => ({ ...v, syncStatus: "idle" }));
      // Sort unsynced videos to the top
      const sortedVideos = mappedVideos.sort((a: VideoItem, b: VideoItem) => {
        if (a.isSynced === b.isSynced) return 0;
        return a.isSynced ? 1 : -1;
      });
      setVideos(sortedVideos);
      setNextPageToken(data.nextPageToken);
      setPrevPageToken(data.prevPageToken);
      
      // Scroll to top of list after fetching
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingList(false);
    }
  };

  const handleSyncVideo = async (videoId: string, mode: "soft" | "hard", isVeg: boolean) => {
    setVideos(prev => prev.map(v => v.videoId === videoId ? { ...v, syncStatus: "loading" } : v));
    
    try {
      // Sync mutates state, so it goes over POST (the API rejects GET for this action).
      const res = await fetch(
        `/api/sync?action=sync&videoId=${encodeURIComponent(videoId)}&mode=${mode}&isVeg=${isVeg}`,
        {
          method: "POST",
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
        logger.error(`Failed to sync ${video.videoId}`, "SyncPage");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSyncingAll(false);
  };

  const syncedCount = videos.filter(v => v.isSynced).length;

  const PaginationControls = () => (
    <Box 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      gap={2} 
      sx={{ my: 2 }}
    >
      <Tooltip title="Previous Page">
        <span>
          <Button
            variant="outlined"
            onClick={() => fetchVideoList(prevPageToken)}
            disabled={!prevPageToken || loadingList || syncingAll}
            startIcon={<ArrowBackIcon />}
          >
            Prev
          </Button>
        </span>
      </Tooltip>
      
      <Tooltip title="Refresh Current Page">
        <span>
          <IconButton 
            onClick={() => fetchVideoList(undefined)} // Note: Better refresh logic would use the current page's token if available
            disabled={loadingList || syncingAll || videos.length === 0}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Next Page">
        <span>
          <Button
            variant="outlined"
            onClick={() => fetchVideoList(nextPageToken)}
            disabled={!nextPageToken || loadingList || syncingAll}
            endIcon={<ArrowForwardIcon />}
          >
            Next
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

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
            Fetch the latest videos from YouTube playlists and choose which ones to sync.
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
                // Load sources once the field is committed, not on every keystroke.
                onBlur={() => { if (secret) fetchSources(); }}
                helperText={
                  sourcesStatus === "loading" ? "Checking secret…"
                  : sourcesStatus === "ready" ? "Secret accepted."
                  : sourcesStatus === "error" ? "Secret rejected."
                  : "Press Tab or click away to connect."
                }
                error={sourcesStatus === "error"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Playlist</InputLabel>
                <Select
                  value={selectedPlaylist}
                  label="Target Playlist"
                  onChange={(e) => setSelectedPlaylist(e.target.value)}
                >
                  {sources.flatMap(source => 
                    source.playlists.map(playlist => (
                      <MenuItem key={playlist.id} value={playlist.id}>
                        {source.channelTitle} - {playlist.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => fetchVideoList()}
                disabled={loadingList || syncingAll}
                sx={{ py: 1.5 }}
                startIcon={loadingList ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              >
                Load Playlist
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleSyncAll}
                disabled={loadingList || syncingAll || videos.length === 0}
                sx={{ py: 1.5 }}
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

          {(nextPageToken || prevPageToken) && <PaginationControls />}

          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {videos.length === 0 && !loadingList && (
              <Box textAlign="center" py={4} color="text.disabled">
                No videos loaded. Enter secret and click &quot;Load Playlist&quot;.
              </Box>
            )}

            {loadingList && (
              <Box textAlign="center" py={8}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                  Fetching videos...
                </Typography>
              </Box>
            )}
            
            {!loadingList && videos.map((video) => (
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
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      {video.channelTitle || "Unknown Channel"}
                    </Typography>
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

          {(nextPageToken || prevPageToken) && !loadingList && <PaginationControls />}
        </Paper>
      </Container>
    </Box>
  );
};

export default SyncPage;
