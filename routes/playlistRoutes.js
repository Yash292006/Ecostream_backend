const express = require('express');
const Playlist = require('../models/Playlist');
const auth = require('../middleware/auth');
const router = express.Router();

// All routes here are protected
router.use(auth);

// Route: GET /api/playlists/featured
// Fetch all global featured playlists
router.get('/featured', async (req, res) => {
  try {
    const featured = await Playlist.find({ isFeatured: true });
    res.json(featured);
  } catch (error) {
    console.error('Error fetching featured playlists:', error);
    res.status(500).json({ error: 'Failed to retrieve featured playlists.' });
  }
});

// Route: GET /api/playlists/featured/:playlistId
// Fetch a single featured playlist detail
router.get('/featured/:playlistId', async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.playlistId, isFeatured: true });
    if (!playlist) {
      return res.status(404).json({ error: 'Featured playlist not found.' });
    }
    res.json(playlist);
  } catch (error) {
    console.error('Error fetching featured playlist details:', error);
    res.status(500).json({ error: 'Failed to retrieve featured playlist.' });
  }
});

// Route: POST /api/playlists/import-spotify
// Import playlist from Spotify URL
router.post('/import-spotify', async (req, res) => {
  const { url } = req.body;
  if (!url || url.trim() === '') {
    return res.status(400).json({ error: 'Spotify playlist URL is required.' });
  }

  try {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid Spotify playlist URL. Must be in open.spotify.com/playlist/... format.' });
    }
    const playlistId = match[1];

    const { getSpotifyPlaylistTracks } = require('../utils/spotify');
    const playlistInfo = await getSpotifyPlaylistTracks(playlistId);

    const newPlaylist = new Playlist({
      name: playlistInfo.name,
      description: playlistInfo.description,
      user: req.user.id,
      isFeatured: false,
      tracks: playlistInfo.tracks
    });

    const savedPlaylist = await newPlaylist.save();
    res.status(201).json(savedPlaylist);
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    res.status(500).json({ error: error.message || 'Failed to import Spotify playlist.' });
  }
});

// Route: GET /api/playlists
// Fetch all playlists for the authenticated user
router.get('/', async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to retrieve playlists.', details: error.message });
  }
});

// Route: POST /api/playlists
// Create a new playlist
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }

  try {
    const newPlaylist = new Playlist({
      name: name.trim(),
      user: req.user.id,
      tracks: []
    });

    const savedPlaylist = await newPlaylist.save();
    res.status(201).json(savedPlaylist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist.', details: error.message });
  }
});

// Route: POST /api/playlists/:playlistId/tracks
// Add a track to a playlist
router.post('/:playlistId/tracks', async (req, res) => {
  const { playlistId } = req.params;
  const { videoId, title, artist, thumbnail, duration } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required for the track.' });
  }

  try {
    const playlist = await Playlist.findOne({ _id: playlistId, user: req.user.id });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied.' });
    }

    let finalVideoId = videoId;
    let finalThumbnail = thumbnail || '';
    let finalDuration = duration || 0;
    let finalArtist = artist || 'Unknown Artist';

    // If videoId is missing, resolve it from YouTube on-the-fly
    if (!finalVideoId) {
      const ytSearch = require('yt-search');
      console.log(`[Resolve] Resolving videoId for "${title}" - "${artist}"...`);
      const query = `${title} ${artist || ''}`.trim();
      const results = await ytSearch(query);
      const videos = results.videos || [];
      if (videos.length > 0) {
        finalVideoId = videos[0].videoId;
        finalThumbnail = videos[0].thumbnail || videos[0].image || '';
        finalDuration = videos[0].seconds || 0;
        if (!artist) {
          finalArtist = videos[0].author ? videos[0].author.name : 'Unknown Artist';
        }
        console.log(`[Resolve] Successfully resolved to videoId: ${finalVideoId}`);
      } else {
        return res.status(404).json({ error: 'Could not resolve track on YouTube.' });
      }
    }

    // Check if the track already exists in the playlist
    const trackExists = playlist.tracks.some(track => track.videoId === finalVideoId);
    if (trackExists) {
      return res.status(400).json({ error: 'Track is already in the playlist.' });
    }

    // Add track
    playlist.tracks.push({
      videoId: finalVideoId,
      title,
      artist: finalArtist,
      thumbnail: finalThumbnail,
      duration: finalDuration
    });

    const updatedPlaylist = await playlist.save();
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    res.status(500).json({ error: 'Failed to add track.', details: error.message });
  }
});

// Route: DELETE /api/playlists/:playlistId/tracks/:videoId
// Remove a track from a playlist
router.delete('/:playlistId/tracks/:videoId', async (req, res) => {
  const { playlistId, videoId } = req.params;

  try {
    const playlist = await Playlist.findOne({ _id: playlistId, user: req.user.id });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied.' });
    }

    // Remove track by filtering out the matching videoId
    const initialLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(track => track.videoId !== videoId);

    if (playlist.tracks.length === initialLength) {
      return res.status(404).json({ error: 'Track not found in this playlist.' });
    }

    const updatedPlaylist = await playlist.save();
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    res.status(500).json({ error: 'Failed to remove track.', details: error.message });
  }
});

// Route: DELETE /api/playlists/:playlistId
// Delete a playlist
router.delete('/:playlistId', async (req, res) => {
  const { playlistId } = req.params;

  try {
    const result = await Playlist.findOneAndDelete({ _id: playlistId, user: req.user.id });
    if (!result) {
      return res.status(404).json({ error: 'Playlist not found or access denied.' });
    }
    res.json({ message: 'Playlist deleted successfully.', id: playlistId });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist.', details: error.message });
  }
});

module.exports = router;
