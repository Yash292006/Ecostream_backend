const Playlist = require('../models/Playlist');

const FEATURED_PLAYLISTS = [
  {
    name: "Today's Top Hits",
    description: "The hottest tracks on the planet right now. Handpicked by EchoStream.",
    isFeatured: true,
    tracks: [
      {
        title: "Espresso",
        artist: "Sabrina Carpenter",
        videoId: "", // Will resolve on play
        thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300",
        duration: 175
      },
      {
        title: "Birds of a Feather",
        artist: "Billie Eilish",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
        duration: 210
      },
      {
        title: "A Bar Song (Tipsy)",
        artist: "Shaboozey",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300",
        duration: 171
      },
      {
        title: "Please Please Please",
        artist: "Sabrina Carpenter",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
        duration: 186
      },
      {
        title: "Too Sweet",
        artist: "Hozier",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300",
        duration: 251
      },
      {
        title: "Not Like Us",
        artist: "Kendrick Lamar",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300",
        duration: 273
      },
      {
        title: "Cruel Summer",
        artist: "Taylor Swift",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=300",
        duration: 178
      }
    ]
  },
  {
    name: "Chill Lofi Study Beats",
    description: "Relaxing lofi instrumentals to study, focus, or wind down.",
    isFeatured: true,
    tracks: [
      {
        title: "Lofi Rain",
        artist: "Chillhop Music",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1515462277126-270d878326e5?w=300",
        duration: 120
      },
      {
        title: "Late Night Coffee",
        artist: "Lofi Girl",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=300",
        duration: 150
      },
      {
        title: "Study Focus Beat",
        artist: "Jazz Hop Café",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300",
        duration: 145
      },
      {
        title: "Afternoon Chill",
        artist: "Lofi Records",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300",
        duration: 132
      },
      {
        title: "Midnight Walk",
        artist: "Sleepy Fish",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300",
        duration: 168
      }
    ]
  },
  {
    name: "Mega Hit Mix",
    description: "The biggest songs of the decade. Non-stop pop & rock favorites.",
    isFeatured: true,
    tracks: [
      {
        title: "Blinding Lights",
        artist: "The Weeknd",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1482440308425-276ad0f28b19?w=300",
        duration: 200
      },
      {
        title: "Shape of You",
        artist: "Ed Sheeran",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300",
        duration: 233
      },
      {
        title: "As It Was",
        artist: "Harry Styles",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
        duration: 167
      },
      {
        title: "Stay",
        artist: "The Kid LAROI & Justin Bieber",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
        duration: 141
      },
      {
        title: "Levitating",
        artist: "Dua Lipa",
        videoId: "",
        thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300",
        duration: 203
      }
    ]
  }
];

async function seedFeaturedPlaylists() {
  try {
    const count = await Playlist.countDocuments({ isFeatured: true });
    if (count === 0) {
      console.log('Seeding default Spotify Original featured playlists...');
      await Playlist.insertMany(FEATURED_PLAYLISTS);
      console.log('Successfully seeded featured playlists.');
    }
  } catch (error) {
    console.error('Error seeding featured playlists:', error);
  }
}

module.exports = { seedFeaturedPlaylists };
