const axios = require('axios');

const PLAYLIST_URL = 'https://open.spotify.com/playlist/1rf4bhZUnYBy3IQWh5X9Vm?si=vndTJJ1qQqmn5imavNvr6g&pi=5w_MlVWqSE-G_';

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
    throw new Error('Could not find __NEXT_DATA__ in Spotify embed page.');
  }

  const parsed = JSON.parse(match[1]);
  const entity = parsed.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('Invalid playlist structure in embed data.');
  }

  const name = entity.name || 'Imported Spotify Playlist';
  const description = entity.subtitle || 'Imported from Spotify';
  const coverUrl = entity.coverArt?.sources?.[0]?.url || '';

  const trackList = entity.trackList || [];
  const tracks = trackList.map(track => ({
    title: track.title,
    artist: track.subtitle || 'Unknown Artist',
    videoId: '',
    thumbnail: coverUrl,
    duration: Math.floor((track.duration || 0) / 1000)
  }));

  if (tracks.length === 0) {
    throw new Error('No tracks found in the public playlist.');
  }

  console.log(`[Spotify Scraper] ✅ Scraped "${name}" successfully with ${tracks.length} tracks.`);
  return { name, description, tracks };
}

async function runTest() {
  try {
    const match = PLAYLIST_URL.match(/playlist\/([a-zA-Z0-9]+)/);
    const playlistId = match[1];
    const result = await getSpotifyPlaylistTracksFromEmbed(playlistId);
    console.log('Playlist Name:', result.name);
    console.log('Description:', result.description);
    console.log('Tracks count:', result.tracks.length);
    console.log('First track details:', result.tracks[0]);
  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
  }
}

runTest();
