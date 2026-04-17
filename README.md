# DataScrapr - All-in-One Data Scraper Platform

A production-ready data scraping platform built with React, Python FastAPI, and Supabase. Features Google OAuth authentication and YouTube data scraping capabilities.

## Features

- Google OAuth Authentication
- YouTube Video & Playlist Scraper
- Export to Excel, PDF, and JSON formats
- Protected Dashboard with User Profile
- Modern, responsive UI with Tailwind CSS
- Secure data handling with Supabase

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite
- Tailwind CSS
- React Router
- Supabase Auth
- Lucide React Icons

### Backend
- Python FastAPI
- YouTube Data API v3
- pandas, openpyxl, fpdf2

### Database & Auth
- Supabase (PostgreSQL + Authentication)

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Supabase account
- YouTube Data API key

## Setup Instructions

### 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Authentication > Providers
3. Get your project URL and anon key from Settings > API

### 2. YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

Update `backend/scraper.py` with your YouTube API key:
```python
API_KEY = 'your_youtube_api_key_here'
```

### 4. Frontend Setup

```bash
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### 5. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will run on `http://localhost:5000`

## Usage

1. Visit `http://localhost:5173`
2. Click "Sign Up" or "Login"
3. Sign in with your Google account
4. Access the dashboard
5. Click "YouTube Scraper"
6. Enter a YouTube URL (video or playlist)
7. Choose your export format
8. Download your data

## Project Structure

```
├── backend/
│   ├── main.py           # FastAPI server
│   ├── scraper.py        # YouTube scraping logic
│   ├── app.py           # Flask server (legacy)
│   └── requirements.txt  # Python dependencies
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── YouTubeScraper.tsx
│   ├── App.tsx
│   └── main.tsx
└── .env
```

## Features Overview

### Home Page
- Professional landing page
- Features showcase
- How it works section
- FAQ section
- Footer with links

### Authentication
- Google OAuth only
- Secure JWT tokens
- User profile management
- Protected routes

### Dashboard
- Three scraper cards (YouTube, Website, Map)
- User profile display
- Quick stats
- Coming soon modals for Website and Map scrapers

### YouTube Scraper
- Extract video data from URLs
- Support for single videos and playlists
- Export to Excel, PDF, or JSON
- Real-time progress indicator
- Success/error handling

## Data Extracted

The YouTube scraper extracts:
- Video title and link
- Channel name and link
- Subscriber count
- View count
- Publish date

## Security

- Google OAuth for authentication
- Row Level Security (RLS) on Supabase
- Protected API routes
- Secure environment variables
- CORS configuration

## Coming Soon

- Website Scraper
- Map Scraper
- Batch processing
- Advanced filters
- Export scheduling

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
