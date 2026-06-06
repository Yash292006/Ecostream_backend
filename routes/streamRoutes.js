const express = require('express');
const { Readable } = require('stream');
const router = express.Router();

// In-memory cache for resolved format information to prevent API rate limiting & socket hang-ups
const formatCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL (YouTube URLs expire in 6 hours)

// Route: GET /api/stream/:videoId
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || videoId.trim() === '') {
    return res.status(400).json({ error: 'Video ID parameter is required.' });
  }

  try {
    const yt = req.app.get('yt');
    if (!yt) {
      return res.status(500).json({ error: 'YouTube client is not initialized.' });
    }

    let format = null;
    const cached = formatCache.get(videoId);
    
    if (cached && cached.expiresAt > Date.now()) {
      format = cached.format;
      console.log(`[Cache Hit] Using cached stream format for videoId: ${videoId}`);
    } else {
      console.log(`[Cache Miss] Resolving streaming data for videoId: ${videoId}...`);
      format = await yt.getStreamingData(videoId, {
        type: 'audio',
        quality: 'best',
        client: 'ANDROID_VR'
      });

      if (format && format.url) {
        formatCache.set(videoId, {
          format,
          expiresAt: Date.now() + CACHE_TTL
        });
      }
    }

    if (!format || !format.url) {
      return res.status(500).json({ error: 'Failed to retrieve streaming URL from YouTube.' });
    }

    const streamUrl = format.url;
    const contentLength = format.content_length;
    const contentType = format.mime_type || 'audio/mpeg';

    // Parse the browser's Range request
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;

      // Limit response chunk size to 1MB to keep buffering snappy and reduce memory/network overhead
      const maxChunkSize = 1024 * 1024; // 1MB
      const actualEnd = Math.min(end, start + maxChunkSize - 1);
      const chunksize = (actualEnd - start) + 1;

      console.log(`Proxying Range request for videoId ${videoId}: bytes=${start}-${actualEnd}/${contentLength} (${chunksize} bytes)`);

      const response = await fetch(streamUrl, {
        headers: {
          'Range': `bytes=${start}-${actualEnd}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`YouTube responded with status ${response.status}`);
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${actualEnd}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);

      req.on('close', () => {
        nodeStream.destroy();
      });

    } else {
      console.log(`No range header for videoId ${videoId}, proxying full file stream...`);
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube responded with status ${response.status}`);
      }

      res.writeHead(200, {
        'Content-Length': contentLength,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });

      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);

      req.on('close', () => {
        nodeStream.destroy();
      });
    }

  } catch (error) {
    console.error(`Error streaming videoId ${videoId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to retrieve audio stream.', 
        details: error.message 
      });
    }
  }
});

module.exports = router;
