import { Link } from 'react-router-dom';
import { Youtube, Globe, Map, ArrowRight, Zap, Shield, Download, CheckCircle } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Youtube className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                DataScrapr
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#faq" className="text-gray-600 hover:text-blue-600 transition-colors">FAQ</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            All-in-One Data Scraper
            <span className="block text-blue-600 mt-2">Platform</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Extract data from YouTube, websites, and maps with ease. Secure, fast, and powerful data scraping for everyone.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Youtube className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">YouTube Scraper</h3>
            <p className="text-gray-600">
              Extract video data, channel information, and statistics from YouTube videos and playlists.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Globe className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Website Scraper</h3>
            <p className="text-gray-600">
              Scrape data from any website with advanced parsing and extraction capabilities.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Map className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Map Scraper</h3>
            <p className="text-gray-600">
              Extract location data, business information, and reviews from map services.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple and straightforward process</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sign Up or Login</h3>
              <p className="text-gray-600">Create account with email and password</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Choose Scraper</h3>
              <p className="text-gray-600">Select from YouTube, Website, or Map scraper</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enter Input</h3>
              <p className="text-gray-600">Provide URL and configure export options</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-red-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Download Data</h3>
              <p className="text-gray-600">Get your data in Excel, PDF, or JSON format</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Features</h2>
            <p className="text-xl text-gray-600">Everything you need for data extraction</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Authentication</h3>
              <p className="text-gray-600">Email and password authentication with encrypted storage</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <Zap className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Scraping</h3>
              <p className="text-gray-600">Optimized algorithms for quick data extraction and processing</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <Download className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Clean Data Output</h3>
              <p className="text-gray-600">Export data in Excel, PDF, or JSON formats ready for analysis</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">FAQ</h2>
            <p className="text-xl text-gray-600">Frequently Asked Questions</p>
          </div>

          <div className="space-y-6">
            <details className="bg-gray-50 rounded-lg p-6 group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex items-center justify-between">
                What data can I scrape?
                <span className="ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                You can scrape YouTube video data, channel information, website content, and map location data. Each scraper is optimized for its specific data source.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6 group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex items-center justify-between">
                Is it secure?
                <span className="ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                Yes! We use SHA-256 password encryption and all data is transmitted over secure HTTPS connections. Your information is protected and never shared.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6 group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex items-center justify-between">
                How do I create an account?
                <span className="ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                Click on "Sign Up" and enter your full name, email address, and password. Your account will be created instantly and you can start scraping right away.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6 group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex items-center justify-between">
                Is scraping legal?
                <span className="ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                Scraping publicly available data is generally legal, but you should always comply with website terms of service and applicable laws in your jurisdiction.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6 group">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex items-center justify-between">
                Is this free?
                <span className="ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-600">
                We offer a free tier with basic features. Premium plans are available for advanced features and higher usage limits.
              </p>
            </details>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Youtube className="h-6 w-6 text-red-600" />
                <span className="text-lg font-bold">DataScrapr</span>
              </div>
              <p className="text-gray-400">
                Professional data scraping platform for modern users.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@datascrapr.com</li>
                <li>Community Forum</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>2025 DataScrapr. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
