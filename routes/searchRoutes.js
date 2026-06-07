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
    console.log(`[Search] Searching YouTube using keyless yt-search for: "${q}"`);
    const result = await ytSearch(q);
    const videos = result.videos || [];
    
    // Slice first 15 results to match the original limit
    const limitedVideos = videos.slice(0, 15);

    // Format the search output for your React frontend
    const formattedVideos = limitedVideos.map(video => ({
      videoId: video.videoId,
      title: video.title,
      artist: video.author?.name || 'Unknown Artist',
      thumbnail: video.thumbnail || video.image || '',
      duration: video.seconds || 0,
      url: video.url || `https://youtube.com/watch?v=${video.videoId}`
    }));

    return res.json(formattedVideos);
  } catch (error) {
    console.error('Search error:', error.message);
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
    console.log(`[Resolve] Searching YouTube using keyless yt-search for: "${query}"`);
    
    const result = await ytSearch(query);
    const videos = result.videos || [];

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No matching track found on YouTube.' });
    }

    const bestMatch = videos[0];

    return res.json({
      videoId: bestMatch.videoId,
      title: bestMatch.title,
      artist: bestMatch.author?.name || 'Unknown Artist',
      thumbnail: bestMatch.thumbnail || bestMatch.image || '',
      duration: bestMatch.seconds || 0,
      url: bestMatch.url || `https://youtube.com/watch?v=${bestMatch.videoId}`
    });
  } catch (error) {
    console.error('Resolve error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to resolve track on YouTube.',
      details: error.message
    });
  }
});

module.exports = router;
