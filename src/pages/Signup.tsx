import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);

  function validate() {
    const e: { [k: string]: string } = {};
    if (!formData.fullName.trim()) e.fullName = 'Full name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email address';
    if (formData.password.length < 6) e.password = 'At least 6 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      await signup(formData.fullName, formData.email, formData.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Signup failed' });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-10 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm">Please log in to continue. Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── LEFT: Form ── */}
      <div className="flex flex-col w-full md:w-1/2 px-8 md:px-16 py-10">
        {/* Logo */}
        <Link to="/" className="flex items-center mb-12">
          <img src="/scrapify.png" alt="Scrapify" className="h-8 object-contain" />
        </Link>

        <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-8">Start scraping in seconds. No credit card required.</p>

          {errors.submit && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => { setFormData({ ...formData, fullName: e.target.value }); if (errors.fullName) setErrors({ ...errors, fullName: '' }); }}
                placeholder="John Doe"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }}
                  placeholder="At least 6 characters"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={e => { setFormData({ ...formData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
                  placeholder="Re-enter password"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : <>Create account <span className="ml-1">→</span></>}
            </button>
          </form>

          <p className="mt-5 text-xs text-center text-gray-400">
            By signing up, you agree to our{' '}
            <a href="#" className="underline hover:text-gray-600">Terms</a> and{' '}
            <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>

          <p className="mt-5 text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-10">© 2026 Scrapify</p>
      </div>

      {/* ── RIGHT: Promo panel ── */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-center px-16 py-10 text-white"
        style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
      >
        <h2 className="text-4xl font-extrabold leading-tight mb-4">
          Join 10,000+<br />teams.
        </h2>
        <p className="text-indigo-200 text-sm leading-relaxed mb-10 max-w-sm">
          From indie founders to enterprise data teams — Scrapify is the modern way to extract data.
        </p>
        <ul className="space-y-3 text-sm">
          {[
            'Free forever plan',
            'Unlimited public scrapes',
            'Excel, PDF & JSON exports',
            'AI-powered with Gemini 2.5',
            'Email support included',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2.5 text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
