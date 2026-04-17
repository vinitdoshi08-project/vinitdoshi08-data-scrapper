import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Youtube, ArrowLeft, FileSpreadsheet, FileText, FileJson, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ScraperResult {
  fileName: string;
  fileFormat: string;
  videoCount: string;
  fileSize: string;
}

export function YouTubeScraper() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('xlsx');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScraperResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setResult(null);
    setError('');

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('url', url);
      formData.append('file_name', fileName);
      formData.append('file_format', fileFormat);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to scrape data');
      }

      const videoCount = response.headers.get('X-Video-Count') || 'N/A';
      const fileSize = response.headers.get('Content-Length')
        ? formatFileSize(parseInt(response.headers.get('Content-Length') || '0'))
        : 'unknown';

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${fileName}.${fileFormat}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(downloadUrl);

      setResult({
        fileName,
        fileFormat,
        videoCount,
        fileSize,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function handleReset() {
    setUrl('');
    setFileName('');
    setFileFormat('xlsx');
    setResult(null);
    setError('');
    setProgress(0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-2">
              <Youtube className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                YouTube Scraper
              </span>
            </div>

            <button
              onClick={() => signOut().then(() => navigate('/'))}
              className="text-gray-600 hover:text-red-600 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center space-x-3">
              <Youtube className="h-8 w-8 text-white" />
              <h1 className="text-2xl font-bold text-white">YouTube Data Scraper</h1>
            </div>
            <p className="text-red-100 mt-2">Extract video data from YouTube videos or playlists</p>
          </div>

          <div className="p-8">
            {!result && !error && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-2">
                    YouTube URL
                  </label>
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Paste a YouTube video or playlist URL
                  </p>
                </div>

                <div>
                  <label htmlFor="fileName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="my-youtube-data"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Choose a name for your exported file
                  </p>
                </div>

                <div>
                  <label htmlFor="fileFormat" className="block text-sm font-semibold text-gray-700 mb-2">
                    File Format
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fileFormat === 'xlsx' ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="format"
                        value="xlsx"
                        checked={fileFormat === 'xlsx'}
                        onChange={(e) => setFileFormat(e.target.value)}
                        className="sr-only"
                      />
                      <FileSpreadsheet className={`h-6 w-6 mr-3 ${fileFormat === 'xlsx' ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-semibold ${fileFormat === 'xlsx' ? 'text-green-900' : 'text-gray-700'}`}>Excel</p>
                        <p className="text-xs text-gray-500">.xlsx</p>
                      </div>
                    </label>

                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fileFormat === 'pdf' ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="format"
                        value="pdf"
                        checked={fileFormat === 'pdf'}
                        onChange={(e) => setFileFormat(e.target.value)}
                        className="sr-only"
                      />
                      <FileText className={`h-6 w-6 mr-3 ${fileFormat === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-semibold ${fileFormat === 'pdf' ? 'text-red-900' : 'text-gray-700'}`}>PDF</p>
                        <p className="text-xs text-gray-500">.pdf</p>
                      </div>
                    </label>

                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fileFormat === 'json' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="format"
                        value="json"
                        checked={fileFormat === 'json'}
                        onChange={(e) => setFileFormat(e.target.value)}
                        className="sr-only"
                      />
                      <FileJson className={`h-6 w-6 mr-3 ${fileFormat === 'json' ? 'text-yellow-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-semibold ${fileFormat === 'json' ? 'text-yellow-900' : 'text-gray-700'}`}>JSON</p>
                        <p className="text-xs text-gray-500">.json</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-6 w-6" />
                      <span>Extract & Download</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {loading && (
              <div className="mt-6">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-700 h-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center text-gray-600 mt-4">Processing your request...</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <h3 className="text-xl font-bold text-green-900">Successfully Processed!</h3>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p><span className="font-semibold">File:</span> {result.fileName}.{result.fileFormat}</p>
                  <p><span className="font-semibold">Videos:</span> {result.videoCount}</p>
                  <p><span className="font-semibold">Size:</span> {result.fileSize}</p>
                  <p><span className="font-semibold">Format:</span> {result.fileFormat.toUpperCase()}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-6 w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  Process Another
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <h3 className="text-xl font-bold text-red-900">Error</h3>
                </div>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                  onClick={handleReset}
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">What data will be extracted?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Video title and link</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Channel name and subscriber count</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>View count and publish date</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Channel link and metadata</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
