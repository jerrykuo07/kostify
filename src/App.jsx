import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

// Baca session dari localStorage secara synchronous
function readSessionSync() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}')
        const s = parsed?.session ?? parsed
        if (s?.user?.id && s?.access_token) return s
      }
    }
  } catch {}
  return null
}

function AppInner() {
  const storedSession   = readSessionSync()
  const [session,  setSession]  = useState(storedSession)
  const [profile,  setProfile]  = useState(null)
  const [page,     setPage]     = useState('home')
  const [showAuth, setShowAuth] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(!!storedSession)

  // ── fetch profile helper ──────────────────────────────────────────
  async function loadProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      return data ?? null
    } catch { return null }
  }

  // ── saat mount: kalau ada session di localStorage, load profile ──
  useEffect(() => {
    if (!storedSession?.user?.id) { setLoadingProfile(false); return }
    loadProfile(storedSession.user.id).then(p => {
      setProfile(p)
      setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
      setLoadingProfile(false)
    })
  }, [])

  // ── listener auth state ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return
      // Hanya handle SIGNED_OUT — login ditangani lewat onLoginSuccess
      if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setPage('home'); setShowAuth(false)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // ── dipanggil langsung dari AuthModal setelah login berhasil ────
  async function onLoginSuccess(newSession) {
    if (!newSession?.user?.id) return
    setSession(newSession)
    setShowAuth(false)
    setLoadingProfile(true)
    const p = await loadProfile(newSession.user.id)
    setProfile(p)
    setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
    setLoadingProfile(false)
  }

  // ── sign out ────────────────────────────────────────────────────
  const signOut = async () => {
    setSession(null); setProfile(null); setPage('home')
    await supabase.auth.signOut()
  }

  // ── loading overlay ─────────────────────────────────────────────
  if (loadingProfile) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f9fafb',gap:12}}>
      <div style={{width:36,height:36,border:'3px solid #e5e7eb',borderTopColor:'#fbbf24',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <p style={{color:'#9ca3af',fontSize:13}}>Memuat profil...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const lp = {
    session, profile,
    onBookNow:       () => session ? setPage(profile?.role==='admin'?'admin':'dashboard') : setShowAuth(true),
    onGoToDashboard: () => setPage('dashboard'),
    onGoToAdmin:     () => setPage('admin'),
    onGoToScanner:   () => setPage('scanner'),
    onSignOut:       signOut,
  }

  return (
    <React.Fragment>
      {page === 'home'      && <LandingPage {...lp}/>}
      {page === 'dashboard' && session && profile?.role !== 'admin' &&
        <TenantDashboard profile={profile} onBack={()=>setPage('home')} onSignOut={signOut}/>}
      {page === 'admin'     && session && profile?.role === 'admin'  &&
        <AdminDashboard  profile={profile} onBack={()=>setPage('home')} onSignOut={signOut}/>}
      {page === 'scanner'   && (
        <div className="min-h-screen bg-slate-950">
          <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 h-14 flex items-center">
            <button onClick={()=>setPage(profile?.role==='admin'?'admin':'home')} className="text-white/40 hover:text-white text-sm">← Kembali</button>
          </div>
          <ScannerPage/>
        </div>
      )}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={()=>setShowAuth(false)}
            onSuccess={onLoginSuccess}
          />
        )}
      </AnimatePresence>
    </React.Fragment>
  )
}

export default function App() {
  return <ThemeProvider><AppInner/></ThemeProvider>
}