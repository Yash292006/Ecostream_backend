const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Helper function to pipe the audio stream to the client or return the URL as JSON.
 */
const pipeStream = async (req, res, streamUrl) => {
  console.log(`[Stream] Resolved streamUrl successfully: ${streamUrl}`);

  // If the request accepts JSON, send JSON. Otherwise, proxy the audio stream directly.
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ streamUrl: streamUrl });
  } else {
    console.log(`[Stream] Proxying audio stream from: ${streamUrl}`);
    const audioResponse = await axios({
      method: 'get',
      url: streamUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    if (audioResponse.headers['content-length']) {
      res.setHeader('Content-Length', audioResponse.headers['content-length']);
    }
    audioResponse.data.pipe(res);
    return;
  }
};

const handleStream = async (req, res) => {
  const { videoId } = req.params;
  const fullYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Stream] Request received for videoId: ${videoId}`);

  // 1. Try Provider 1 (youtube-mp310)
  try {
    console.log(`[Stream] Trying Provider 1 (youtube-mp310)...`);
    const response = await axios.get('https://youtube-mp310.p.rapidapi.com/download/mp3', {
      params: { url: fullYoutubeUrl },
      headers: {
        'x-rapidapi-host': 'youtube-mp310.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      },
      timeout: 6000
    });

    const streamUrl = response.data.downloadUrl || response.data.url || response.data;
    if (streamUrl && typeof streamUrl === 'string') {
      return await pipeStream(req, res, streamUrl);
    }
    throw new Error('Invalid download URL returned from Provider 1');
  } catch (error1) {
    console.warn(`[Stream] Provider 1 failed (${error1.message}). Trying Provider 2 (youtube-mp36)...`);

    // 2. Try Provider 2 (youtube-mp36 - offers 100 free daily conversions)
    try {
      const response = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
        params: { id: videoId },
        headers: {
          'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        timeout: 6000
      });

      const streamUrl = response.data.link;
      if (streamUrl && typeof streamUrl === 'string') {
        return await pipeStream(req, res, streamUrl);
      }
      throw new Error('Invalid download URL returned from Provider 2');
    } catch (error2) {
      console.warn(`[Stream] Provider 2 failed (${error2.message}). Trying Provider 3 (youtube-to-mp3-download)...`);

      // 3. Try Provider 3 (youtube-to-mp3-download)
      try {
        const response = await axios.get('https://youtube-to-mp3-download.p.rapidapi.com/download', {
          params: { url: fullYoutubeUrl },
          headers: {
            'x-rapidapi-host': 'youtube-to-mp3-download.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY
          },
          timeout: 6000
        });

        const streamUrl = response.data.downloadUrl || response.data.url;
        if (streamUrl && typeof streamUrl === 'string') {
          return await pipeStream(req, res, streamUrl);
        }
        throw new Error('Invalid download URL returned from Provider 3');
      } catch (error3) {
        console.error('[Stream] All streaming providers failed:', error3.message);
        return res.status(500).json({ error: "Failed to fetch audio stream. All providers exhausted." });
      }
    }
  }
};

// Route: GET /api/stream/:videoId (standard)
router.get('/:videoId', handleStream);

// Route: GET /api/stream/stream/:videoId (fallback matching example snippet)
router.get('/stream/:videoId', handleStream);

module.exports = router;
