import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Shield, Zap, Brain, Bot, ArrowRight, Star, CheckCircle2 } from 'lucide-react';

const STYLES = `
  @keyframes orb-a { 0%,100%{transform:translate(0,0)} 40%{transform:translate(22px,-28px)} 70%{transform:translate(-14px,18px)} }
  @keyframes orb-b { 0%,100%{transform:translate(0,0)} 40%{transform:translate(-20px,22px)} 70%{transform:translate(16px,-14px)} }
  @keyframes orb-c { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-16px)} }
  @keyframes fade-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide-in  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fade-in   { from{opacity:0} to{opacity:1} }
  @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ring-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes btn-pulse { 0%,100%{box-shadow:0 4px 16px rgba(91,79,232,.40)} 50%{box-shadow:0 6px 26px rgba(91,79,232,.58)} }

  .afu { animation: fade-up  .55s cubic-bezier(.22,1,.36,1) both }
  .afi { animation: fade-in  .45s ease both }
  .asi { animation: slide-in .55s cubic-bezier(.22,1,.36,1) both }
  .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}
  .d4{animation-delay:.24s}.d5{animation-delay:.30s}.d6{animation-delay:.36s}
  .d7{animation-delay:.42s}.d8{animation-delay:.48s}

  .lg-inp {
    width:100%; padding:10px 13px; font-size:13.5px; color:#111827;
    border-radius:8px; outline:none; box-sizing:border-box; font-family:inherit;
    border:1px solid #e5e7eb; background:#f9fafb;
    transition:border-color .18s,box-shadow .18s,background .18s;
    line-height:1.4;
  }
  .lg-inp:focus { border-color:#5B4FE8; background:#fff; box-shadow:0 0 0 3px rgba(91,79,232,.12); }
  .lg-inp.err   { border-color:#f87171; background:#fff8f8; }
  .lg-inp::placeholder { color:#9ca3af; font-size:13px; }

  .lg-btn {
    width:100%; padding:11px 20px; border-radius:8px; border:none; cursor:pointer;
    font-size:14px; font-weight:600; color:#fff; font-family:inherit;
    background:linear-gradient(135deg,#5B4FE8 0%,#7C6FEF 100%);
    display:flex; align-items:center; justify-content:center; gap:8px;
    animation:btn-pulse 2.8s ease-in-out infinite;
    transition:opacity .15s,transform .15s;
  }
  .lg-btn:hover:not(:disabled){ opacity:.9; transform:translateY(-1px); }
  .lg-btn:active:not(:disabled){ transform:translateY(0); }
  .lg-btn:disabled { opacity:.55; cursor:not-allowed; animation:none; }

  .feat-row {
    display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px;
    background:rgba(255,255,255,.72); border:1px solid rgba(91,79,232,.10);
    backdrop-filter:blur(8px); box-shadow:0 1px 6px rgba(91,79,232,.05);
    transition:transform .2s,box-shadow .2s;
  }
  .feat-row:hover { transform:translateX(3px); box-shadow:0 3px 14px rgba(91,79,232,.11); }

  .stat-c {
    background:rgba(255,255,255,.75); border:1px solid rgba(91,79,232,.10);
    border-radius:10px; padding:10px 6px; text-align:center;
    backdrop-filter:blur(8px); box-shadow:0 1px 6px rgba(91,79,232,.05);
  }
  .quote-c {
    background:rgba(255,255,255,.72); border:1px solid rgba(91,79,232,.11);
    border-radius:12px; padding:13px 15px; backdrop-filter:blur(10px);
    box-shadow:0 2px 12px rgba(91,79,232,.07);
  }
  .orb { position:absolute; border-radius:50%; pointer-events:none; }
`;

export function Login() {
  const navigate = useNavigate();
  const { signin, user, loading } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [mounted, setMounted] = useState(false);
  const injected = useRef(false);

  useEffect(() => {
    if (!injected.current) {
      const el = document.createElement('style');
      el.textContent = STYLES;
      document.head.appendChild(el);
      injected.current = true;
    }
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ width: 34, height: 34, border: '3px solid #e0e7ff', borderTopColor: '#5B4FE8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  );

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

  const m = mounted;
  const FF = 'ui-sans-serif,system-ui,sans-serif';

  return (
    /* Root: exactly 100vh, no overflow */
    <div style={{ height: '100vh', display: 'flex', fontFamily: FF, letterSpacing: '-0.011em', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════
          LEFT PANEL  50vw × 100vh
      ══════════════════════════════════════ */}
      <div
        className="hidden md:flex"
        style={{
          width: '50%', height: '100%', flexDirection: 'column',
          padding: '32px 48px', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 55% at 15% 10%,rgba(91,79,232,.11) 0%,transparent 60%), linear-gradient(170deg,oklch(0.985 0.005 250) 0%,#fff 100%)',
        }}
      >
        {/* dot grid */}
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',
          backgroundImage:'linear-gradient(to right,rgba(17,24,39,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(17,24,39,.04) 1px,transparent 1px)',
          backgroundSize:'48px 48px' }} />

        {/* orbs */}
        <div className="orb" style={{ width:380,height:380,top:-140,left:-140, background:'radial-gradient(circle,rgba(91,79,232,.11) 0%,transparent 65%)', animation:'orb-a 12s ease-in-out infinite' }} />
        <div className="orb" style={{ width:240,height:240,bottom:-60,right:-50, background:'radial-gradient(circle,rgba(124,111,239,.12) 0%,transparent 65%)', animation:'orb-b 9s ease-in-out infinite' }} />
        <div className="orb" style={{ width:140,height:140,top:'44%',right:'8%', background:'radial-gradient(circle,rgba(91,79,232,.09) 0%,transparent 70%)', animation:'orb-c 6s ease-in-out infinite' }} />

        {/* ── Logo ── */}
        <div className={m ? 'afu' : ''} style={{ position:'relative',zIndex:10,flexShrink:0 }}>
          <Link to="/">
            <img src="/scrapify.png" alt="Scrapify" style={{ height:48,width:'auto',objectFit:'contain' }} />
          </Link>
        </div>

        {/* ── Middle copy — flex-1 centered ── */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',justifyContent:'center',position:'relative',zIndex:10,minHeight:0 }}>

          {/* Badge */}
          <div className={m ? 'afu d1' : ''} style={{
            display:'inline-flex',alignItems:'center',gap:8,background:'#fff',
            border:'1px solid #e5e7eb',borderRadius:9999,padding:'4px 12px',
            boxShadow:'0 1px 3px rgba(0,0,0,.06)',marginBottom:16,width:'fit-content',
          }}>
            <Bot style={{ width:13,height:13,color:'#5B4FE8' }} />
            <span style={{ fontSize:11.5,fontWeight:500,color:'#6b7280' }}>AI-powered extraction · Gemini 2.5</span>
          </div>

          {/* Headline */}
          <h2 className={m ? 'afu d2' : ''} style={{ fontSize:34,fontWeight:700,lineHeight:1.1,letterSpacing:'-0.025em',color:'#111827',marginBottom:12 }}>
            All-in-one data scraper<br />
            <span style={{ color:'#5B4FE8' }}>for modern teams.</span>
          </h2>

          {/* Subtext */}
          <p className={m ? 'afu d3' : ''} style={{ fontSize:14,color:'#6b7280',lineHeight:1.65,maxWidth:320,marginBottom:22,fontWeight:400 }}>
            Extract structured data from YouTube, websites, and maps in seconds. Secure, fast, and beautifully simple.
          </p>

          {/* Features */}
          <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {[
              { icon:<Shield style={{width:14,height:14,color:'#5B4FE8'}}/>, label:'Bank-grade security',    sub:'Encrypted & isolated workspaces', d:'d4' },
              { icon:<Zap   style={{width:14,height:14,color:'#7C6FEF'}}/>, label:'Lightning fast scraping', sub:'Sub-second on 10k+ requests',     d:'d5' },
              { icon:<Brain style={{width:14,height:14,color:'#5B4FE8'}}/>, label:'AI-powered extraction',   sub:'Adapts to any page automatically', d:'d6' },
            ].map((f,i) => (
              <div key={i} className={`feat-row ${m ? `afu ${f.d}` : ''}`}>
                <div style={{ width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background:'linear-gradient(135deg,rgba(91,79,232,.09),rgba(124,111,239,.15))' }}>
                  {f.icon}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12.5,fontWeight:600,color:'#111827',lineHeight:1.3 }}>{f.label}</p>
                  <p style={{ fontSize:11,color:'#9ca3af',marginTop:1,fontWeight:400 }}>{f.sub}</p>
                </div>
                <CheckCircle2 style={{ width:14,height:14,color:'#7C6FEF',flexShrink:0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats + Quote — bottom ── */}
        <div style={{ flexShrink:0,position:'relative',zIndex:10 }}>

          {/* Stats */}
          <div className={m ? 'afu d7' : ''} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:10 }}>
            {[
              { val:'50K+', label:'Daily scrapes', c:'#5B4FE8' },
              { val:'99.8%',label:'Uptime SLA',    c:'#7C6FEF' },
              { val:'4.9★', label:'User rating',   c:'#f59e0b' },
            ].map((s,i) => (
              <div key={i} className="stat-c">
                <p style={{ fontSize:17,fontWeight:700,color:s.c,letterSpacing:'-0.025em',lineHeight:1 }}>{s.val}</p>
                <p style={{ fontSize:10,color:'#9ca3af',marginTop:3,fontWeight:500 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className={`quote-c ${m ? 'afu d8' : ''}`}>
            <div style={{ display:'flex',gap:2,marginBottom:7 }}>
              {[...Array(5)].map((_,i) => <Star key={i} style={{ width:10,height:10,color:'#f59e0b',fill:'#f59e0b' }} />)}
            </div>
            <p style={{ fontSize:12,color:'#374151',lineHeight:1.6,fontStyle:'italic',marginBottom:9,fontWeight:400 }}>
              "Scrapify replaced three of our internal tools. The team ships data pipelines in hours, not weeks."
            </p>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',flexShrink:0,
                background:'linear-gradient(135deg,#5B4FE8,#7C6FEF)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'#fff',fontSize:10,fontWeight:700 }}>SC</div>
              <div>
                <p style={{ fontSize:12,fontWeight:600,color:'#111827' }}>Sarah Chen</p>
                <p style={{ fontSize:10.5,color:'#9ca3af',fontWeight:400 }}>Head of Data, Northwind</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT PANEL  50vw × 100vh
      ══════════════════════════════════════ */}
      <div style={{
        flex:1, height:'100%', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'24px 20px', position:'relative', overflow:'hidden',
        background:'linear-gradient(155deg,#ffffff 0%,#f8f7ff 50%,#f0eeff 100%)',
      }}>

        {/* soft orbs */}
        <div className="orb" style={{ width:240,height:240,top:-40,right:-40, background:'radial-gradient(circle,rgba(124,111,239,.09) 0%,transparent 70%)', animation:'orb-b 12s ease-in-out infinite' }} />
        <div className="orb" style={{ width:160,height:160,bottom:0,left:-30, background:'radial-gradient(circle,rgba(91,79,232,.07) 0%,transparent 70%)', animation:'orb-a 15s ease-in-out infinite' }} />

        {/* mobile logo */}
        <div className={`md:hidden afi`} style={{ marginBottom:20 }}>
          <Link to="/"><img src="/scrapify.png" alt="Scrapify" style={{ height:34,objectFit:'contain' }} /></Link>
        </div>

        {/* ── Card ── */}
        <div
          className={m ? 'asi' : ''}
          style={{
            width:'100%', maxWidth:390, position:'relative', zIndex:10,
            background:'#fff', borderRadius:16,
            border:'1px solid #e5e7eb',
            padding:'30px 32px 26px',
            boxShadow:'0 1px 3px rgba(91,79,232,.05),0 8px 28px rgba(91,79,232,.09)',
          }}
        >
          {/* spinning ring corner decoration */}
          <div style={{ position:'absolute',top:-14,right:-14,width:56,height:56,borderRadius:'50%',
            background:'conic-gradient(from 0deg,#5B4FE8,#7C6FEF,#5B4FE8)',
            animation:'ring-spin 10s linear infinite',opacity:.12,pointerEvents:'none',zIndex:0 }} />
          <div style={{ position:'absolute',top:-3,right:-3,width:34,height:34,borderRadius:'50%',background:'#f8f7ff',pointerEvents:'none',zIndex:1 }} />

          {/* Logo — top of card */}
          <div className={m ? 'afu' : ''} style={{ marginBottom:22,position:'relative',zIndex:2 }}>
            <Link to="/">
              <img src="/scrapify.png" alt="Scrapify" style={{ height:40,width:'auto',objectFit:'contain',display:'block' }} />
            </Link>
          </div>

          {/* Heading */}
          <div className={m ? 'afu d1' : ''} style={{ marginBottom:18,position:'relative',zIndex:2 }}>
            <h1 style={{ fontSize:23,fontWeight:700,color:'#111827',letterSpacing:'-0.025em',marginBottom:5,lineHeight:1.2 }}>
              Welcome back 👋
            </h1>
            <p style={{ fontSize:13,color:'#6b7280',lineHeight:1.5,fontWeight:400 }}>
              Sign in to your Scrapify account.
            </p>
          </div>

          {errors.submit && (
            <div className="afu" style={{ marginBottom:12,background:'#fef2f2',border:'1px solid #fecaca',
              color:'#dc2626',padding:'9px 12px',borderRadius:8,fontSize:13,position:'relative',zIndex:2 }}>
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:12,position:'relative',zIndex:2 }}>

            {/* Email */}
            <div className={m ? 'afu d2' : ''}>
              <label style={{ display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:5 }}>Email address</label>
              <input type="email" value={formData.email}
                onChange={e => { setFormData({...formData,email:e.target.value}); if(errors.email) setErrors({...errors,email:''}); }}
                placeholder="you@example.com"
                className={`lg-inp${errors.email?' err':''}`} />
              {errors.email && <p style={{ marginTop:3,fontSize:11.5,color:'#ef4444' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div className={m ? 'afu d3' : ''}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5 }}>
                <label style={{ fontSize:13,fontWeight:500,color:'#374151' }}>Password</label>
                <a href="#" style={{ fontSize:12,color:'#5B4FE8',fontWeight:500,textDecoration:'none' }}
                  onMouseOver={e=>(e.currentTarget.style.color='#4338ca')}
                  onMouseOut={e=>(e.currentTarget.style.color='#5B4FE8')}>Forgot password?</a>
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPassword?'text':'password'} value={formData.password}
                  onChange={e => { setFormData({...formData,password:e.target.value}); if(errors.password) setErrors({...errors,password:''}); }}
                  placeholder="••••••••"
                  className={`lg-inp${errors.password?' err':''}`}
                  style={{ paddingRight:40 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:0,
                    display:'flex',alignItems:'center',transition:'color .15s' }}
                  onMouseOver={e=>(e.currentTarget.style.color='#5B4FE8')}
                  onMouseOut={e=>(e.currentTarget.style.color='#9ca3af')}>
                  {showPassword ? <EyeOff style={{width:15,height:15}}/> : <Eye style={{width:15,height:15}}/>}
                </button>
              </div>
              {errors.password && <p style={{ marginTop:3,fontSize:11.5,color:'#ef4444' }}>{errors.password}</p>}
            </div>

            {/* Remember me */}
            <label className={m ? 'afu d4' : ''} style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none' }}>
              <input type="checkbox" style={{ width:14,height:14,accentColor:'#5B4FE8',cursor:'pointer' }} />
              <span style={{ fontSize:13,color:'#6b7280',fontWeight:400 }}>Remember me for 30 days</span>
            </label>

            {/* Sign in button */}
            <div className={m ? 'afu d5' : ''}>
              <button type="submit" disabled={formLoading} className="lg-btn">
                {formLoading
                  ? <><Loader2 style={{width:15,height:15,animation:'spin .7s linear infinite'}}/> Signing in…</>
                  : <>Sign in <ArrowRight style={{width:15,height:15}}/></>}
              </button>
            </div>
          </form>

          {/* SSL */}
          <div className={m ? 'afu d6' : ''} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginTop:12,position:'relative',zIndex:2 }}>
            <svg width="10" height="12" viewBox="0 0 12 14" fill="none" style={{flexShrink:0}}>
              <path d="M6 1L1.5 3.5v4C1.5 10.8 3.5 13 6 13.5c2.5-.5 4.5-2.7 4.5-6v-4L6 1z" fill="#5B4FE8" opacity=".55"/>
              <path d="M4 7l1.5 1.5L8 5.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:11,color:'#9ca3af',fontWeight:400 }}>256-bit SSL encryption</span>
          </div>

          {/* Sign up */}
          <p className={m ? 'afu d7' : ''} style={{ textAlign:'center',fontSize:13,color:'#6b7280',marginTop:14,fontWeight:400,position:'relative',zIndex:2 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:'#5B4FE8',fontWeight:600,textDecoration:'none' }}
              onMouseOver={e=>(e.currentTarget.style.color='#4338ca')}
              onMouseOut={e=>(e.currentTarget.style.color='#5B4FE8')}>Create one</Link>
          </p>
        </div>

        <p className={m ? 'afi d8' : ''} style={{ marginTop:16,fontSize:11,color:'#d1d5db',textAlign:'center',position:'relative',zIndex:2 }}>
          © 2026 Scrapify · All rights reserved
        </p>
      </div>

    </div>
  );
}
