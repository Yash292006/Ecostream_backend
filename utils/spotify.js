const axios = require('axios');

/**
 * Gets a Spotify Client Credentials access token.
 * Uses SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET from .env
 */
async function getSpotifyToken(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 8000,
    }
  );

  return response.data.access_token;
}

/**
 * Fetches playlist tracks using the official Spotify Web API.
 * Used as a fallback if the public scraper fails.
 */
async function getSpotifyPlaylistTracksFromApi(playlistId) {
  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set in backend/.env. ' +
      'Create a free app at https://developer.spotify.com/dashboard to get these keys.'
    );
  }

  console.log(`[Spotify API] Getting access token...`);
  let accessToken;
  try {
    accessToken = await getSpotifyToken(clientId, clientSecret);
    console.log(`[Spotify API] Access token obtained successfully.`);
  } catch (err) {
    const status = err.response?.status;
    const body   = err.response?.data;
    console.error('[Spotify API] Token error:', status, body);

    if (status === 400 || status === 401) {
      throw new Error(
        'Invalid Spotify credentials. Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in backend/.env.'
      );
    }
    throw new Error(`Failed to connect to Spotify API: ${err.message}`);
  }

  const headers = { Authorization: `Bearer ${accessToken}` };

  console.log(`[Spotify API] Fetching playlist info for ID: ${playlistId}`);
  let playlistData;
  try {
    const playlistRes = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,tracks(next,items(track(name,artists,album,duration_ms)))`,
      { headers, timeout: 10000 }
    );
    playlistData = playlistRes.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      throw new Error('Spotify token expired mid-request. Please try again.');
    }
    if (status === 403) {
      throw new Error(
        'Access denied by Spotify. Make sure the playlist is PUBLIC, not private or collaborative.'
      );
    }
    if (status === 404) {
      throw new Error(
        'Playlist not found. Make sure the URL is correct and the playlist is set to PUBLIC on Spotify.'
      );
    }
    throw new Error(`Spotify API error (${status}): ${err.message}`);
  }

  let allItems = [...(playlistData.tracks?.items || [])];
  let nextUrl  = playlistData.tracks?.next;

  while (nextUrl) {
    console.log(`[Spotify API] Fetching next page: ${nextUrl}`);
    try {
      const pageRes = await axios.get(nextUrl, { headers, timeout: 10000 });
      allItems.push(...(pageRes.data.items || []));
      nextUrl = pageRes.data.next;
    } catch (err) {
      console.warn('[Spotify API] Pagination error, stopping:', err.message);
      break; 
    }
  }

  console.log(`[Spotify API] Total tracks collected: ${allItems.length}`);

  const tracks = allItems
    .filter(item => item && item.track && item.track.name) 
    .map(item => {
      const track = item.track;
      return {
        title:     track.name,
        artist:    (track.artists || []).map(a => a.name).join(', ') || 'Unknown Artist',
        videoId:   '', 
        thumbnail: track.album?.images?.[0]?.url || '',
        duration:  Math.floor((track.duration_ms || 0) / 1000),
      };
    });

  if (tracks.length === 0) {
    throw new Error('The Spotify playlist appears to be empty.');
  }

  return {
    name:        playlistData.name        || 'Imported Spotify Playlist',
    description: playlistData.description || 'Imported from Spotify',
    tracks,
  };
}

/**
 * Fetches playlist tracks by parsing the public Spotify embed player HTML.
 * Requires NO developer API credentials and is highly robust for any public playlist.
 */
async function getSpotifyPlaylistTracksFromEmbed(playlistId) {
  console.log(`[Spotify Scraper] Fetching playlist embed for ID: ${playlistId}`);
  const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    },
    timeout: 10000
  });

  const html = response.data;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('Could not find preloaded track data in Spotify embed player page.');
  }

  const parsed = JSON.parse(match[1]);
  const entity = parsed.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('Invalid playlist structure in embed track data.');
  }

  const name = entity.name || 'Imported Spotify Playlist';
  const description = entity.subtitle || 'Imported from Spotify';
  const coverUrl = entity.coverArt?.sources?.[0]?.url || '';

  const trackList = entity.trackList || [];
  const tracks = trackList.map(track => ({
    title:     track.title,
    artist:    track.subtitle || 'Unknown Artist',
    videoId:   '', 
    thumbnail: coverUrl,
    duration:  Math.floor((track.duration || 0) / 1000),
  }));

  if (tracks.length === 0) {
    throw new Error('No tracks found in the public playlist embed.');
  }

  console.log(`[Spotify Scraper] ✅ Scraped "${name}" successfully with ${tracks.length} tracks.`);
  return { name, description, tracks };
}

/**
 * Unified entrypoint to retrieve tracks from a Spotify playlist.
 * Prioritizes the credential-less public scraper, falling back to official API credentials.
 */
async function getSpotifyPlaylistTracks(playlistId) {
  try {
    // 1. Try public embed scraper first (no credentials required, handles all public playlists)
    return await getSpotifyPlaylistTracksFromEmbed(playlistId);
  } catch (scrapeError) {
    console.warn(`[Spotify] Scraper failed (${scrapeError.message}). Falling back to official Web API...`);
    try {
      // 2. Fall back to official API client credentials if configured
      return await getSpotifyPlaylistTracksFromApi(playlistId);
    } catch (apiError) {
      console.error(`[Spotify] Web API fallback also failed: ${apiError.message}`);
      // Propagate the scraper error as it is more descriptive for public playlists
      throw new Error(`Failed to import Spotify playlist. Detail: ${scrapeError.message}`);
    }
  }
}

module.exports = { getSpotifyPlaylistTracks };
