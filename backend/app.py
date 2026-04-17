
from flask import Flask, render_template, request, send_file, jsonify, after_this_request
import os
import re
import tempfile
import json
from datetime import datetime
from utils.scraper import extract_id_from_url, fetch_playlist_videos, fetch_video_details, save_to_excel, save_to_pdf, save_to_json

app = Flask(__name__)
app.secret_key = 'your_secret_key'

def validate_file_name(file_name):
    if not file_name or len(file_name) > 100:
        return False
    return re.match(r'^[\w\-. ]+$', file_name) is not None

def is_valid_youtube_url(url):
    patterns = [
        r'^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+',
        r'^https?:\/\/youtube\.com\/watch\?v=[\w-]+(&list=[\w-]+)?',
        r'^https?:\/\/youtube\.com\/playlist\?list=[\w-]+',
        r'^https?:\/\/youtu\.be\/[\w-]+(\?list=[\w-]+)?'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        url = request.form.get('url', '').strip()
        file_format = request.form.get('file_format', '').lower()
        file_name = request.form.get('file_name', '').strip()

        # Validate inputs
        if not all([url, file_format, file_name]):
            return jsonify({"status": "error", "message": "Please fill all fields!"}), 400

        if not validate_file_name(file_name):
            return jsonify({
                "status": "error",
                "message": "Invalid file name. Only letters, numbers, spaces, hyphens, underscores and dots allowed."
            }), 400

        if not is_valid_youtube_url(url):
            return jsonify({
                "status": "error",
                "message": "Invalid YouTube URL. Please provide valid video or playlist URL."
            }), 400

        try:
            # Extract and process content
            url_type, id_value = extract_id_from_url(url)
            if not id_value:
                return jsonify({
                    "status": "error",
                    "message": "Could not extract video/playlist ID from URL"
                }), 400

            # Fetch data
            video_data = []
            if url_type == 'playlist':
                video_data = fetch_playlist_videos(id_value)
            elif url_type == 'video':
                video_data = [fetch_video_details(id_value)]

            if not video_data:
                return jsonify({
                    "status": "error",
                    "message": "No videos found. Playlist might be empty or private."
                }), 404

            # Create temp directory
            temp_dir = tempfile.mkdtemp()
            output_filename = f"{file_name}.{file_format}"
            temp_file_path = os.path.join(temp_dir, output_filename)

            # Save file based on format
            if file_format == 'xlsx':
                save_to_excel(video_data, temp_file_path)
            elif file_format == 'pdf':
                save_to_pdf(video_data, temp_file_path)
            elif file_format == 'json':
                save_to_json(video_data, temp_file_path)
            else:
                return jsonify({
                    "status": "error",
                    "message": "Unsupported file format"
                }), 400

            # Cleanup after response
            @after_this_request
            def cleanup(response):
                try:
                    os.remove(temp_file_path)
                    os.rmdir(temp_dir)
                except Exception as e:
                    app.logger.error(f"Cleanup error: {str(e)}")
                return response

            # Return file with video count in headers
            response = send_file(
                temp_file_path,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/octet-stream'
            )
            response.headers['X-Video-Count'] = str(len(video_data))
            return response

        except Exception as e:
            app.logger.error(f"Error processing request: {str(e)}")
            return jsonify({
                "status": "error",
                "message": f"Processing error: {str(e)}"
            }), 500

    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)