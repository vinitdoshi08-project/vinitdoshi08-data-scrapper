import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Bot, Shield, Zap, Brain } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signin, user, loading } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  function validate() {
    const e: { [k: string]: string } = {};
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email address';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setFormLoading(true);
      setErrors({});
      await signin(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Login failed' });
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── LEFT: Form panel ── */}
      <div className="flex flex-col w-full md:w-1/2 px-8 md:px-16 py-10">
        {/* Logo */}
        <Link to="/" className="flex items-center mb-16">
          <img src="/scrapify.png" alt="Scrapify" className="h-12 w-auto object-contain" />
        </Link>

        <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your Scrapify account.</p>

          {errors.submit && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }}
                placeholder="you@example.com"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-gray-600">Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
            >
              {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign in <span className="ml-1">→</span></>}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-semibold hover:text-indigo-700">Create one</Link>
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-10">© 2026 Scrapify</p>
      </div>

      {/* ── RIGHT: Promo panel ── */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-center px-16 py-10 text-white"
        style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
      >
        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-medium mb-10 w-fit">
          <Bot className="w-3.5 h-3.5" /> AI-powered extraction
        </div>
        <h2 className="text-4xl font-extrabold leading-tight mb-4">
          Ship clean data,<br />faster.
        </h2>
        <p className="text-indigo-200 text-sm leading-relaxed mb-10 max-w-sm">
          Scrapify is the all-in-one platform trusted by data teams to extract, structure, and export the data they need.
        </p>
        <ul className="space-y-4 text-sm">
          {[
            { icon: <Shield className="w-4 h-4" />, text: 'Bank-grade security and isolated workspaces' },
            { icon: <Zap className="w-4 h-4" />, text: 'Sub-second response times on 10k+ scrapes' },
            { icon: <Brain className="w-4 h-4" />, text: 'AI extraction adapts to any page structure' },
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-indigo-100">
              <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
