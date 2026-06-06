const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: false
  },
  title: {
    type: String,
    required: true
  },
  artist: {
    type: String,
    default: 'Unknown Artist'
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0 // Duration in seconds
  }
});

const PlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tracks: [TrackSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
