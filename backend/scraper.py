import pandas as pd
from fpdf import FPDF
from datetime import datetime
import os
import json
from urllib.parse import urlparse, parse_qs
from googleapiclient.discovery import build
from concurrent.futures import ThreadPoolExecutor
from fpdf.enums import XPos, YPos

# Replace with your static YouTube API Key
API_KEY = 'AIzaSyBqdv7jCf4bgLXvelxIPqR7oLEl0a3YCkY'

# Function to detect the type of URL and extract the necessary ID
def extract_id_from_url(url):
    try:
        query = parse_qs(urlparse(url).query)
        if 'list' in query:
            return 'playlist', query['list'][0]  # Return playlist ID
        elif 'v' in query:
            return 'video', query['v'][0]       # Return video ID
        else:
            return None, None
    except Exception as e:
        print(f"Error extracting ID from URL: {e}")
        return None, None

# Function to fetch video details
def fetch_video_details(video_id):
    youtube = build('youtube', 'v3', developerKey=API_KEY)
    try:
        video_request = youtube.videos().list(part='snippet,statistics', id=video_id)
        video_response = video_request.execute()

        if not video_response['items']:
            return None

        video = video_response['items'][0]
        title = video['snippet']['title']
        channel_id = video['snippet']['channelId']
        channel_name = video['snippet']['channelTitle']
        video_link = f"https://www.youtube.com/watch?v={video_id}"
        publish_time = datetime.strptime(video['snippet']['publishedAt'], '%Y-%m-%dT%H:%M:%SZ')
        formatted_publish_time = publish_time.strftime('%Y-%m-%d')

        channel_details = fetch_channel_details(channel_id)
        if not channel_details:
            return None

        return {
            'Video Title': title,
            'Video Link': video_link,
            'Channel Name': channel_name,
            'Total Subscribers': channel_details['subscribers'],
            'Channel Link': f"https://www.youtube.com/channel/{channel_id}",
            'Current Views': video['statistics'].get('viewCount', 'N/A'),
            'Video Publish Date': formatted_publish_time
        }
    except Exception as e:
        print(f"Error fetching video details for {video_id}: {e}")
        return None

# Function to fetch channel details
def fetch_channel_details(channel_id):
    youtube = build('youtube', 'v3', developerKey=API_KEY)
    try:
        channel_request = youtube.channels().list(part='statistics', id=channel_id)
        channel_response = channel_request.execute()

        if not channel_response['items']:
            return None

        channel = channel_response['items'][0]
        return {'subscribers': channel['statistics'].get('subscriberCount', 'N/A')}
    except Exception as e:
        print(f"Error fetching channel details for {channel_id}: {e}")
        return None

# Function to fetch videos from the playlist
def fetch_playlist_videos(playlist_id):
    youtube = build('youtube', 'v3', developerKey=API_KEY)
    videos = []

    # Fetch playlist items
    next_page_token = None
    while True:
        try:
            playlist_request = youtube.playlistItems().list(
                part='snippet',
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token
            )
            playlist_response = playlist_request.execute()

            video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response['items']]
            with ThreadPoolExecutor(max_workers=5) as executor:
                video_details_list = executor.map(fetch_video_details, video_ids)

            videos.extend(filter(None, video_details_list))  # Add valid details

            next_page_token = playlist_response.get('nextPageToken')
            if not next_page_token:
                break
        except Exception as e:
            print(f"Error fetching playlist videos: {e}")
            break

    return videos

# Save data to Excel (append if file exists)
def save_to_excel(data, file_name):
    try:
        df = pd.DataFrame(data)
        if os.path.exists(file_name):
            existing_df = pd.read_excel(file_name, engine='openpyxl')
            combined_df = pd.concat([existing_df, df]).drop_duplicates(subset=['Video Link'], keep='last')
        else:
            combined_df = df

        # Save to Excel with formatting
        with pd.ExcelWriter(file_name, engine='openpyxl') as writer:
            combined_df.to_excel(writer, index=False, sheet_name='Video Data')

            # Apply formatting (bold headers)
            workbook = writer.book
            worksheet = writer.sheets['Video Data']
            for cell in worksheet[1]:
                cell.font = cell.font.copy(bold=True)  # Make headers bold

            # Apply blue color and make the links clickable
            for row in worksheet.iter_rows(min_row=2, max_col=combined_df.shape[1], max_row=combined_df.shape[0] + 1):
                for cell in row:
                    if "http" in str(cell.value):  # Check if it's a URL
                        cell.font = cell.font.copy(color="0000FF")  # Set font color to blue
                        cell.hyperlink = cell.value  # Make it clickable

        print(f"Data saved to {file_name}")
        return len(data)  # Return the number of records saved
    except Exception as e:
        print(f"Error saving data to Excel: {e}")
        return 0

# Save data to PDF
def save_to_pdf(data, file_name):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12, style='B')  # Bold header

    # Add title
    pdf.cell(200, 10, txt="YouTube Video Details", ln=True, align='C')

    # Reset font for content
    pdf.set_font("Helvetica", size=10)

    for item in data:
        pdf.ln(5)  # Add some vertical space
        for key, value in item.items():
            value = str(value)  # Ensure all values are strings
            if len(value) > 90:  # Check if value is too long for one line
                pdf.multi_cell(0, 10, txt=f"{key}: {value}")
            else:
                if "http" in value:  # Check if it's a URL
                    pdf.set_text_color(0, 0, 255)  # Set font color to blue
                    pdf.cell(0, 10, txt=f"{key}: {value}", link=value, ln=True)
                    pdf.set_text_color(0, 0, 0)  # Reset color to black after the link
                else:
                    pdf.cell(0, 10, txt=f"{key}: {value}", ln=True)

    try:
        pdf.output(file_name)
        print(f"Data saved to {file_name}")
        return len(data)  # Return the number of records saved
    except Exception as e:
        print(f"Error saving data to PDF: {e}")
        return 0

# Save data to JSON with pretty formatting
def save_to_json(data, file_name):
    try:
        # Convert data to pretty-printed JSON
        json_data = json.dumps(data, indent=4, ensure_ascii=False)
        
        # Save to file
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(json_data)
            
        print(f"Data saved to {file_name}")
        return len(data)
    except Exception as e:
        print(f"Error saving data to JSON: {e}")
        return 0

# Main function (looped for continuous input)
def main():
    while True:
        try:
            # Get user inputs for URL and file format
            url = input("Enter YouTube URL (playlist or video) or 'exit' to quit: ")
            if url.lower() == 'exit':
                print("Exiting program.")
                break  # Exit the loop if the user types 'exit'
            
            file_name = input("Enter the filename to save data (without extension): ")
            file_format = input("Enter the file format to save data (xlsx/pdf/json): ").lower()

            if file_format not in ['xlsx', 'pdf', 'json']:
                print("Invalid file format. Please choose 'xlsx', 'pdf', or 'json'.")
                continue  # Continue the loop for another input

            url_type, id_value = extract_id_from_url(url)
            if not id_value:
                print("Invalid URL. Please enter a valid YouTube playlist or video URL.")
                continue  # Continue the loop for another input

            if url_type == 'playlist':
                print("Fetching videos from playlist...")
                video_data = fetch_playlist_videos(id_value)
            elif url_type == 'video':
                print("Fetching details of the video...")
                video_data = [fetch_video_details(id_value)]

            if not video_data:
                print("No data fetched. Please check the URL and try again.")
                continue  # Continue the loop for another input

            # Save to file based on the user selection
            records_scraped = 0
            if file_format == 'xlsx':
                records_scraped = save_to_excel(video_data, f"{file_name}.xlsx")
            elif file_format == 'pdf':
                records_scraped = save_to_pdf(video_data, f"{file_name}.pdf")
            elif file_format == 'json':
                records_scraped = save_to_json(video_data, f"{file_name}.json")

            if records_scraped > 0:
                print(f"\nData Scrapped Successfully!")
                print(f"File saved: {file_name}.{file_format}")
                print(f"Total Videos Scraped: {records_scraped}")
            else:
                print("No data was scraped or saved.")

            print("Done!")

        except Exception as e:
            print(f"Error in main function: {e}")

# Run the main function
if __name__ == '__main__':
    main()