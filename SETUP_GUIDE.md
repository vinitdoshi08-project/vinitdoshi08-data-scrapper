# Quick Setup Guide

## 1. Supabase Configuration

### Database
The database schema has already been created with the following:
- `profiles` table for user data
- Row Level Security (RLS) policies
- Auto-trigger for new user profile creation

### Google OAuth Setup

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Google** and toggle it ON
4. You'll need to create a Google OAuth app:

#### Creating Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Choose **Web application**
7. Add authorized redirect URIs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
   (Get your exact URL from Supabase Google provider settings)
8. Copy the **Client ID** and **Client Secret**
9. Paste them into Supabase Google provider settings
10. Save the changes

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:5000
```

Get your Supabase URL and anon key from:
**Project Settings > API**

## 2. YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Go to **APIs & Services > Library**
4. Search for "YouTube Data API v3"
5. Click **Enable**
6. Go to **APIs & Services > Credentials**
7. Click **Create Credentials > API Key**
8. Copy the API key
9. Update `backend/scraper.py`:
   ```python
   API_KEY = 'your-youtube-api-key-here'
   ```

## 3. Running the Application

### Frontend
```bash
npm install
npm run dev
```
Access at: `http://localhost:5173`

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Runs at: `http://localhost:5000`

## 4. Testing Authentication

1. Visit `http://localhost:5173`
2. Click "Login" or "Sign Up"
3. Click "Sign in with Google"
4. You'll be redirected to Google login
5. After authentication, you'll be redirected to the dashboard

## 5. Testing YouTube Scraper

1. Log in to the dashboard
2. Click "YouTube Scraper"
3. Enter a YouTube URL:
   - Video: `https://youtube.com/watch?v=VIDEO_ID`
   - Playlist: `https://youtube.com/playlist?list=PLAYLIST_ID`
4. Enter a file name
5. Choose export format (Excel, PDF, or JSON)
6. Click "Extract & Download"

## Common Issues

### Google OAuth not working
- Ensure redirect URI in Google Console matches Supabase
- Check that Google provider is enabled in Supabase
- Verify Client ID and Secret are correct

### YouTube API errors
- Check API key is valid and not restricted
- Ensure YouTube Data API v3 is enabled
- Verify quota limits haven't been exceeded

### Backend connection issues
- Ensure backend is running on port 5000
- Check CORS settings in `backend/main.py`
- Verify VITE_API_URL in `.env`

## Production Deployment

### Frontend
Build the frontend:
```bash
npm run build
```
Deploy the `dist` folder to:
- Vercel
- Netlify
- Cloudflare Pages

### Backend
Deploy to:
- Railway
- Render
- Fly.io
- AWS/GCP/Azure

Update `VITE_API_URL` to your production backend URL.

## Security Checklist

- [x] Google OAuth configured
- [x] RLS enabled on all tables
- [x] Protected routes implemented
- [x] Environment variables not committed
- [ ] Update API key restrictions in production
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting on backend
- [ ] Enable Supabase email confirmations (optional)

## Support

For issues:
1. Check the README.md
2. Review console errors
3. Verify all environment variables
4. Check Supabase logs
5. Review backend logs
