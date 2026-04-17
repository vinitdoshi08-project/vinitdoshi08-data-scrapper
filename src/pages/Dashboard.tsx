import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Youtube, Globe, Map, LogOut, Settings, ArrowRight, X, User as UserIcon, Edit2, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Dashboard() {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [comingSoonType, setComingSoonType] = useState('');

  // Settings / Profile states
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setEditEmail(user.email || '');
    }
  }, [user]);

  const userInitials = user?.full_name
    ?.split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setIsUpdating(true);
    try {
      if (updateProfile) {
        await updateProfile(editName, editEmail);
        setIsEditingProfile(false);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleLogOut() {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  function handleYouTubeClick() {
    navigate('/youtube-scraper');
  }

  function handleComingSoon(type: string) {
    setComingSoonType(type);
    setShowComingSoon(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Youtube className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                DataScrapr
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 hidden sm:flex cursor-pointer group" onClick={() => setShowSettings(true)}>
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-200 group-hover:ring-blue-400 shadow-md group-hover:shadow-lg transition-all transform group-hover:scale-105" title="Profile Details">
                  {!avatarError ? (
                    <img
                      src="/avatar.png"
                      alt={user?.full_name || 'User Avatar'}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {userInitials}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-900 font-semibold text-sm leading-tight group-hover:text-blue-600 transition-colors">
                    {user?.full_name}
                  </span>
                  <span className="text-gray-500 text-xs">
                    View Profile
                  </span>
                </div>
              </div>
              
              <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-full"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogOut}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-full"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.full_name?.split(' ')[0]}!</h1>
          <p className="text-xl text-gray-600">Choose a scraper to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            onClick={handleYouTubeClick}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-red-200"
          >
            <div className="bg-red-100 w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
              <Youtube className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">YouTube Scraper</h2>
            <p className="text-gray-600 mb-6">
              Extract comprehensive data from YouTube videos, channels, and playlists.
            </p>
            <div className="flex items-center text-red-600 font-semibold">
              Start Scraping <ArrowRight className="ml-2 h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => handleComingSoon('Website')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-green-200 relative"
          >
            <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
              COMING SOON
            </div>
            <div className="bg-green-100 w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Website Scraper</h2>
            <p className="text-gray-600 mb-6">
              Scrape data from any website with advanced parsing capabilities.
            </p>
            <div className="flex items-center text-green-600 font-semibold">
              Learn More <ArrowRight className="ml-2 h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => handleComingSoon('Map')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-blue-200 relative"
          >
            <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              COMING SOON
            </div>
            <div className="bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
              <Map className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Map Scraper</h2>
            <p className="text-gray-600 mb-6">
              Extract location data and business information from map services.
            </p>
            <div className="flex items-center text-blue-600 font-semibold">
              Learn More <ArrowRight className="ml-2 h-5 w-5" />
            </div>
          </div>
        </div>


      </main>

      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowComingSoon(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="bg-gradient-to-tr from-blue-100 to-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                {comingSoonType === 'Website' ? (
                  <Globe className="h-10 w-10 text-blue-600" />
                ) : (
                  <Map className="h-10 w-10 text-blue-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {comingSoonType} Scraper
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                This feature is coming soon! We're working hard to bring you the best {comingSoonType.toLowerCase()} scraping experience.
              </p>
              <button
                onClick={() => setShowComingSoon(false)}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg w-full"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100 mx-auto">
            <button
              onClick={() => {
                setShowSettings(false);
                setIsEditingProfile(false);
                setProfileError('');
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-all bg-gray-50 p-2 rounded-full hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-8 flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4 group/avatar">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-xl border-4 border-white transform group-hover/avatar:scale-105 transition-transform duration-300">
                  {!avatarError ? (
                    <img
                      src="/avatar.png"
                      alt={user?.full_name || 'User Avatar'}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                      {userInitials}
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm animate-pulse"></span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Profile Overview</h2>
              <p className="text-gray-500 text-sm">Manage your account details and preferences</p>
            </div>

            {profileError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm font-medium flex items-center shadow-sm">
                <span className="flex-1">{profileError}</span>
              </div>
            )}

            {!isEditingProfile ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors shadow-sm">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">{user?.full_name}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors shadow-sm">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">{user?.email}</p>
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all gap-2 transform hover:-translate-y-0.5"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Profile Details
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white transition-all outline-none"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white transition-all outline-none"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditName(user?.full_name || '');
                      setEditEmail(user?.email || '');
                      setProfileError('');
                    }}
                    className="flex-1 py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed gap-2"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
