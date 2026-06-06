const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const dns = require('dns');

// Prioritize IPv4 DNS resolution to prevent YouTube socket connection drops / false login requirements
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend cross-origin requests
app.use(cors({
  origin: '*', // Allows all origins in development; adjust for production
}));

// Body parser middleware
app.use(express.json());

// Import API routers
const searchRoutes = require('./routes/searchRoutes');
const streamRoutes = require('./routes/streamRoutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

// Mount routes
app.use('/api/search', searchRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);

// General health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spotify Clone Backend is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize Innertube client and Mongoose once at startup
async function startServer() {
  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spotify_clone';
    await mongoose.connect(mongoUri);
    console.log('MongoDB successfully connected.');

    // Seed featured playlists
    const { seedFeaturedPlaylists } = require('./utils/seeder');
    await seedFeaturedPlaylists();

    // 2. Initialize youtubei.js InnerTube client
    console.log('Initializing youtubei.js InnerTube client...');
    const { Innertube, Platform } = await import('youtubei.js');

    // Configure JavaScript evaluator for deciphering signatures in youtubei.js
    Platform.shim.eval = (data) => {
      return new Function(data.code || data.output)();
    };

    const yt = await Innertube.create();
    app.set('yt', yt);
    console.log('InnerTube client successfully initialized.');

    // 3. Start server
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize dependencies / start server:', error);
    process.exit(1);
  }
}

startServer();
