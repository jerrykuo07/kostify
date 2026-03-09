import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

function readStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}')
        const s = parsed?.session ?? parsed
        if (s?.user && s?.access_token) {
          const exp = s.expires_at ?? s.user?.exp
          if (exp && Date.now() / 1000 > exp + 3600) return null // expired > 1 jam
          return s
        }
      }
    }
  } catch {}
  return null
}

function AppInner() {
  const [session, setSession]   = useState(() => readStorage())
  const [profile, setProfile]   = useState(null)
  const [page, setPage]         = useState('home')
  const [showAuth, setShowAuth] = useState(false)

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      return data ?? null
    } catch { return null }
  }

  // Load profile saat mount — kalau ada session dari localStorage
  useEffect(() => {
    const s = readStorage()
    if (!s?.user?.id) return
    fetchProfile(s.user.id).then(p => {
      if (p) setProfile(p)
    })
  }, [])

  // Listen auth events
  useEffect(() => {
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      console.log('[App]', event, s?.user?.email ?? 'none')

      if (event === 'SIGNED_IN' && s) {
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p); setShowAuth(false)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
      }
      if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setPage('home')
      }
      if (event === 'TOKEN_REFRESHED' && s) {
        setSession(s)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    setSession(null); setProfile(null); setPage('home')
    await supabase.auth.signOut()
  }

  // Role dari session JWT (tidak perlu tunggu profile)
  const sessionRole = session?.user?.user_metadata?.role ?? session?.user?.app_metadata?.role ?? null
  const hasSession  = !!session?.user

  const goToDashboard = () => {
    if (!hasSession) { setShowAuth(true); return }
    // Pakai role dari profile kalau sudah ada, fallback ke sessionRole
    const role = profile?.role ?? sessionRole
    setPage(role === 'admin' ? 'admin' : 'dashboard')
  }

  const lp = {
    session, profile,
    onBookNow:       goToDashboard,
    onGoToDashboard: () => setPage('dashboard'),
    onGoToAdmin:     () => setPage('admin'),
    onGoToScanner:   () => setPage('scanner'),
    onSignOut:       signOut,
  }

  // Render dashboard/admin — kalau profile belum ada tapi session ada,
  // TenantDashboard/AdminDashboard akan fetch data sendiri menggunakan session
  return (
    <React.Fragment>
      {page === 'home' && <LandingPage {...lp}/>}

      {page === 'dashboard' && hasSession && (
        <TenantDashboard
          profile={profile}
          onBack={()=>setPage('home')}
          onSignOut={signOut}
          onProfileLoad={p => setProfile(p)}
        />
      )}

      {page === 'admin' && hasSession && (
        <AdminDashboard
          profile={profile}
          onBack={()=>setPage('home')}
          onSignOut={signOut}
          onProfileLoad={p => setProfile(p)}
        />
      )}

      {page === 'scanner' && (
        <div className="min-h-screen bg-slate-950">
          <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 h-14 flex items-center">
            <button onClick={()=>setPage(profile?.role==='admin'?'admin':'home')} className="text-white/40 hover:text-white text-sm">← Kembali</button>
          </div>
          <ScannerPage/>
        </div>
      )}

      <AnimatePresence>
        {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onSuccess={()=>setShowAuth(false)}/>}
      </AnimatePresence>
    </React.Fragment>
  )
}

export default function App() {
  return <ThemeProvider><AppInner/></ThemeProvider>
}