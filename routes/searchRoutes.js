const express = require('express');
const ytSearch = require('yt-search');
const router = express.Router();

// Route: GET /api/search?q=query
router.get('/', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  try {
    // Perform YouTube search using the search query
    const results = await ytSearch(q);
    const videos = results.videos || [];
    
    // Format the search output into a clean, structured JSON array
    const formattedVideos = videos.slice(0, 15).map(video => ({
      videoId: video.videoId,
      title: video.title,
      artist: video.author ? video.author.name : 'Unknown Artist',
      thumbnail: video.thumbnail || video.image,
      duration: video.seconds,
      timestamp: video.timestamp,
      url: video.url
    }));

    return res.json(formattedVideos);
  } catch (error) {
    console.error('Error in YouTube search route:', error);
    return res.status(500).json({ 
      error: 'Failed to search YouTube.', 
      details: error.message 
    });
  }
});

// Route: GET /api/search/resolve?title=song&artist=artist
router.get('/resolve', async (req, res) => {
  const { title, artist } = req.query;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Search title is required.' });
  }

  try {
    const query = `${title} ${artist || ''}`.trim();
    console.log(`[Resolve] Searching YouTube for query: "${query}"`);
    const results = await ytSearch(query);
    const videos = results.videos || [];

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No matching track found on YouTube.' });
    }

    const bestMatch = videos[0];
    return res.json({
      videoId: bestMatch.videoId,
      title: bestMatch.title,
      artist: bestMatch.author ? bestMatch.author.name : (artist || 'Unknown Artist'),
      thumbnail: bestMatch.thumbnail || bestMatch.image || '',
      duration: bestMatch.seconds,
      timestamp: bestMatch.timestamp,
      url: bestMatch.url
    });
  } catch (error) {
    console.error('Error resolving track:', error);
    return res.status(500).json({ 
      error: 'Failed to resolve track on YouTube.', 
      details: error.message 
    });
  }
});

module.exports = router;
