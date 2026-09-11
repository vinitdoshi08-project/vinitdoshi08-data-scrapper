import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { YouTubeScraper } from './pages/YouTubeScraper';
import { WebsiteScraper } from './pages/WebsiteScraper';
import { MapScraper } from './pages/MapScraper';
import { Subscription } from './pages/Subscription';
import { Profile } from './pages/Profile';
import { Guide } from './pages/Guide';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/youtube-scraper" element={<ProtectedRoute><YouTubeScraper /></ProtectedRoute>} />
            <Route path="/website-scraper" element={<ProtectedRoute><WebsiteScraper /></ProtectedRoute>} />
            <Route path="/map-scraper" element={<ProtectedRoute><MapScraper /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
