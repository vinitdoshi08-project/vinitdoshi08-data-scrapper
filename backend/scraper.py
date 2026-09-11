from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font
from fpdf import FPDF
from datetime import datetime
import os
import re
import json
from urllib.parse import urlparse, parse_qs
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from concurrent.futures import ThreadPoolExecutor, as_completed
from fpdf.enums import XPos, YPos

# Default API key from environment (set in Render dashboard)
DEFAULT_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')


from typing import Optional

def extract_id_from_url(url: str):
    """Return (type, id) — type is 'playlist', 'video', 'handle', 'channel', or 'search'."""
    try:
        trimmed = url.strip()
        if not trimmed:
            return None, None

        # Direct playlist ID (starts with PL, UU, etc. and long)
        if re.match(r'^(PL|UU|FL|OL)[a-zA-Z0-9_-]{10,}$', trimmed):
            return 'playlist', trimmed

        # Direct 11-char video ID (e.g. fgCu3O7uoSY)
        if re.match(r'^[a-zA-Z0-9_-]{11}$', trimmed):
            return 'video', trimmed

        # Direct @handle
        if trimmed.startswith('@'):
            return 'handle', trimmed

        parsed = urlparse(trimmed if '://' in trimmed else f'https://{trimmed}')
        query = parse_qs(parsed.query)

        # youtu.be short links: youtu.be/<video_id>
        if 'youtu.be' in parsed.netloc:
            video_id = parsed.path.lstrip('/')
            if video_id:
                return 'video', video_id

        list_param = query.get('list', [None])[0]
        v_param = query.get('v', [None])[0]

        # 1. If URL has 'v' and 'list' is a YouTube Mix/Radio (RD...) or personal list (WL, LL), treat as single video
        if v_param and list_param and any(list_param.startswith(p) for p in ('RD', 'WL', 'LL', 'LM')):
            return 'video', v_param

        # 2. If 'list' is a valid playlist (PL, UU, FL, OL)
        if list_param and any(list_param.startswith(p) for p in ('PL', 'UU', 'FL', 'OL')):
            return 'playlist', list_param

        # 3. If 'v' is present in query, treat as video
        if v_param:
            return 'video', v_param

        # 4. Any other 'list'
        if list_param:
            return 'playlist', list_param

        # Check path segments
        path_parts = [p for p in parsed.path.split('/') if p]

        # /shorts/<id>
        if 'shorts' in path_parts:
            idx = path_parts.index('shorts')
            if idx + 1 < len(path_parts):
                return 'video', path_parts[idx + 1]

        # /embed/<id>
        if 'embed' in path_parts:
            idx = path_parts.index('embed')
            if idx + 1 < len(path_parts):
                return 'video', path_parts[idx + 1]

        # /live/<id>
        if 'live' in path_parts:
            idx = path_parts.index('live')
            if idx + 1 < len(path_parts):
                return 'video', path_parts[idx + 1]

        # @handle (e.g. youtube.com/@channelName)
        if path_parts and path_parts[0].startswith('@'):
            return 'handle', path_parts[0]

        # /channel/<UC...>
        if 'channel' in path_parts:
            idx = path_parts.index('channel')
            if idx + 1 < len(path_parts):
                return 'channel', path_parts[idx + 1]

        # /c/<custom_name> or /user/<username>
        if 'c' in path_parts or 'user' in path_parts:
            return 'handle', path_parts[-1]

        # Plain search keyword or query
        if not parsed.netloc or not any(k in parsed.netloc for k in ('youtube.com', 'youtu.be')):
            return 'search', trimmed

        return None, None
    except Exception as e:
        print(f"Error extracting ID from URL: {e}")
        return None, None


def _build_youtube(api_key: str):
    return build('youtube', 'v3', developerKey=api_key, cache_discovery=False)


def fetch_channel_details(channel_id: str, api_key: str):
    youtube = _build_youtube(api_key)
    response = youtube.channels().list(part='statistics', id=channel_id).execute()
    if not response.get('items'):
        return {'subscribers': 'N/A'}
    stats = response['items'][0].get('statistics', {})
    return {'subscribers': stats.get('subscriberCount', 'N/A')}


def fetch_batch_video_details(video_ids: list, api_key: str):
    """
    Fetch full details for multiple videos using YouTube API v3 batching (50 IDs per call).
    Also batches channel subscriber lookups. Ultra fast & low quota usage.
    """
    if not video_ids:
        return []

    youtube = _build_youtube(api_key)
    raw_videos = []

    # Batch 50 video IDs per request
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        try:
            res = youtube.videos().list(part='snippet,statistics', id=','.join(chunk)).execute()
            raw_videos.extend(res.get('items', []))
        except HttpError as e:
            raise e
        except Exception as e:
            print(f"Error fetching batch video details: {e}")

    # Collect unique channel IDs for batch querying
    unique_channel_ids = list({
        item['snippet']['channelId']
        for item in raw_videos
        if 'snippet' in item and 'channelId' in item['snippet']
    })

    channel_map = {}
    for i in range(0, len(unique_channel_ids), 50):
        ch_chunk = unique_channel_ids[i:i + 50]
        try:
            ch_res = youtube.channels().list(part='statistics', id=','.join(ch_chunk)).execute()
            for ch in ch_res.get('items', []):
                channel_map[ch['id']] = ch.get('statistics', {}).get('subscriberCount', 'N/A')
        except Exception as e:
            print(f"Error fetching channel batch: {e}")

    results = []
    for video in raw_videos:
        vid = video.get('id', '')
        snippet = video.get('snippet', {})
        stats = video.get('statistics', {})
        ch_id = snippet.get('channelId', '')

        pub = snippet.get('publishedAt', 'N/A')
        try:
            publish_time = datetime.strptime(pub, '%Y-%m-%dT%H:%M:%SZ')
            formatted_date = publish_time.strftime('%Y-%m-%d')
        except Exception:
            formatted_date = pub

        results.append({
            'Video Title':        snippet.get('title', 'N/A'),
            'Video Link':         f"https://www.youtube.com/watch?v={vid}",
            'Channel Name':       snippet.get('channelTitle', 'N/A'),
            'Total Subscribers':  channel_map.get(ch_id, 'N/A'),
            'Channel Link':       f"https://www.youtube.com/channel/{ch_id}" if ch_id else 'N/A',
            'Current Views':      stats.get('viewCount', '0'),
            'Likes':              stats.get('likeCount', '0'),
            'Comments':           stats.get('commentCount', '0'),
            'Video Publish Date': formatted_date,
        })

    return results


def fetch_video_details(video_id: str, api_key: str):
    """Fetch full details for a single video. Raises on API error."""
    batch = fetch_batch_video_details([video_id], api_key)
    return batch[0] if batch else None


def fetch_playlist_videos(playlist_id: str, api_key: str, max_results: Optional[int] = None, sort_by: str = 'newest'):
    """
    Fetch videos from a playlist with optional limit and sorting.
    Uses batch fetching in chunks of 50 for near-instant speed.
    """
    youtube = _build_youtube(api_key)
    video_ids = []
    next_page_token = None

    target_count = max_results if (max_results is not None and max_results > 0) else None

    while True:
        page_size = 50
        if target_count:
            remaining = target_count - len(video_ids)
            if remaining <= 0:
                break
            page_size = min(50, remaining)

        request = youtube.playlistItems().list(
            part='snippet',
            playlistId=playlist_id,
            maxResults=page_size,
            pageToken=next_page_token,
        )
        response = request.execute()

        for item in response.get('items', []):
            vid = item.get('snippet', {}).get('resourceId', {}).get('videoId')
            if vid:
                video_ids.append(vid)
                if target_count and len(video_ids) >= target_count:
                    break

        next_page_token = response.get('nextPageToken')
        if not next_page_token or (target_count and len(video_ids) >= target_count):
            break

    if not video_ids:
        return []

    videos = fetch_batch_video_details(video_ids, api_key)

    # Sort results
    if sort_by == 'views':
        videos.sort(key=lambda x: int(x.get('Current Views') or 0) if str(x.get('Current Views', '0')).isdigit() else 0, reverse=True)
    elif sort_by == 'likes':
        videos.sort(key=lambda x: int(x.get('Likes') or 0) if str(x.get('Likes', '0')).isdigit() else 0, reverse=True)
    elif sort_by == 'newest':
        videos.sort(key=lambda x: str(x.get('Video Publish Date', '')), reverse=True)

    return videos


def fetch_channel_uploads(channel_identifier: str, api_key: str, is_handle: bool = False, max_results: Optional[int] = None, sort_by: str = 'newest'):
    """Fetch recent uploads from a channel ID or @handle with fallbacks."""
    youtube = _build_youtube(api_key)
    items = []

    if is_handle:
        handle = channel_identifier.lstrip('@')
        try:
            ch_resp = youtube.channels().list(part='contentDetails,snippet', forHandle=handle).execute()
            items = ch_resp.get('items', [])
        except Exception as e:
            print(f"forHandle error: {e}")

        # Fallback to search if forHandle returned empty
        if not items:
            try:
                s_resp = youtube.search().list(part='snippet', q=f"@{handle}", type='channel', maxResults=1).execute()
                s_items = s_resp.get('items', [])
                if s_items:
                    ch_id = s_items[0].get('snippet', {}).get('channelId') or s_items[0].get('id', {}).get('channelId')
                    if ch_id:
                        ch_resp = youtube.channels().list(part='contentDetails', id=ch_id).execute()
                        items = ch_resp.get('items', [])
            except Exception as e:
                print(f"search channel error: {e}")
    else:
        try:
            ch_resp = youtube.channels().list(part='contentDetails', id=channel_identifier).execute()
            items = ch_resp.get('items', [])
        except Exception as e:
            print(f"channels.list error: {e}")

    if not items:
        # If channel not resolved, directly search videos by channel name/handle
        return fetch_search_videos(channel_identifier, api_key, max_results=max_results, sort_by=sort_by)

    uploads_playlist_id = items[0].get('contentDetails', {}).get('relatedPlaylists', {}).get('uploads')
    if not uploads_playlist_id:
        ch_id = items[0].get('id', '')
        if ch_id.startswith('UC'):
            uploads_playlist_id = 'UU' + ch_id[2:]

    if not uploads_playlist_id:
        return fetch_search_videos(channel_identifier, api_key, max_results=max_results, sort_by=sort_by)

    try:
        return fetch_playlist_videos(uploads_playlist_id, api_key, max_results=max_results, sort_by=sort_by)
    except Exception as e:
        print(f"fetch_playlist_videos error on uploads playlist: {e}")
        return fetch_search_videos(channel_identifier, api_key, max_results=max_results, sort_by=sort_by)


def fetch_search_videos(query: str, api_key: str, max_results: Optional[int] = None, sort_by: str = 'newest'):
    """Search videos by keyword and return enriched details."""
    youtube = _build_youtube(api_key)
    limit = max_results if (max_results is not None and max_results > 0) else 25
    order = 'date' if sort_by == 'newest' else ('viewCount' if sort_by == 'views' else 'relevance')

    search_resp = youtube.search().list(
        part='snippet',
        q=query,
        type='video',
        maxResults=min(limit, 50),
        order=order
    ).execute()

    video_ids = [item['id']['videoId'] for item in search_resp.get('items', []) if 'id' in item and 'videoId' in item['id']]
    videos = fetch_batch_video_details(video_ids, api_key)
    return videos


# ── Export helpers ────────────────────────────────────────────

def save_to_excel(data: list, file_name: str):
    try:
        headers = list(data[0].keys())
        wb = Workbook()
        ws = wb.active
        # Header row
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
        # Data rows
        for row_idx, item in enumerate(data, 2):
            for col, header in enumerate(headers, 1):
                value = item.get(header, '')
                cell = ws.cell(row=row_idx, column=col, value=value)
                if value and "http" in str(value):
                    cell.font = Font(color="0000FF")
                    cell.hyperlink = str(value)
        wb.save(file_name)
        return len(data)
    except Exception as e:
        print(f"Error saving Excel: {e}")
        raise


def _clean_pdf_text(text: str) -> str:
    if not text:
        return ""
    # Strip emojis and characters outside latin-1 so Helvetica renders without crashing
    clean = str(text).encode('latin-1', errors='ignore').decode('latin-1')
    return clean.strip() or "N/A"


def save_to_pdf(data: list, file_name: str):
    try:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Helvetica", size=14, style='B')
        pdf.cell(0, 10, text="YouTube Video Details", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.set_font("Helvetica", size=9)

        for item in data:
            pdf.ln(4)
            for key, value in item.items():
                val_str = str(value)
                clean_val = _clean_pdf_text(val_str)
                line = f"{key}: {clean_val}"
                if "http" in val_str:
                    pdf.set_text_color(0, 0, 255)
                    pdf.cell(0, 7, text=line, link=val_str, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                    pdf.set_text_color(0, 0, 0)
                elif len(line) > 90:
                    pdf.multi_cell(0, 6, text=line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                else:
                    pdf.cell(0, 6, text=line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        pdf.output(file_name)
        return len(data)
    except Exception as e:
        print(f"Error saving PDF: {e}")
        raise


def save_to_json(data: list, file_name: str):
    try:
        with open(file_name, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return len(data)
    except Exception as e:
        print(f"Error saving JSON: {e}")
        raise
