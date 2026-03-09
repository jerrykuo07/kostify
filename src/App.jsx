import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

// Baca session dari localStorage TANPA async - langsung saat module load
function readSessionFromStorage() {
  try {
    // Supabase menyimpan session dengan key seperti "sb-xxx-auth-token"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const session = parsed?.session ?? parsed
        if (session?.user && session?.access_token) {
          // Cek belum expired
          const exp = session.expires_at ?? session.user?.exp
          if (exp && Date.now() / 1000 > exp) return null
          return session
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

function AppInner() {
  // Baca session dari localStorage SYNCHRONOUSLY sebagai initial state
  // Ini yang membuat app tidak perlu tunggu async sama sekali
  const [cachedSession] = useState(() => readSessionFromStorage())
  const [session, setSession]     = useState(cachedSession)
  const [profile, setProfile]     = useState(null)
  const [page, setPage]           = useState('home')
  const [showAuth, setShowAuth]   = useState(false)
  // Kalau ada cached session, langsung authReady = true (tidak perlu loading)
  const [authReady, setAuthReady] = useState(() => true)

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      return data ?? null
    } catch { return null }
  }

  // Load profile dari cached session langsung — tanpa tunggu Supabase event
  useEffect(() => {
    if (cachedSession?.user?.id) {
      fetchProfile(cachedSession.user.id).then(p => {
        if (p) {
          setProfile(p)
          setPage(p.role === 'admin' ? 'admin' : 'dashboard')
        }
      })
    }
  }, [])

  // Listen perubahan auth (login/logout) — tapi TIDAK blocking
  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      console.log('[App] event:', event, '| user:', s?.user?.email ?? 'none')

      if (event === 'SIGNED_IN' && s) {
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p); setShowAuth(false)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setPage('home')
        return
      }

      if (event === 'TOKEN_REFRESHED' && s) {
        setSession(s)
      }

      if (event === 'INITIAL_SESSION') {
        if (!s && !cachedSession) {
          // Benar-benar tidak ada session
          setSession(null); setProfile(null); setPage('home')
        }
        // Kalau ada s tapi profile belum load
        if (s && !profile) {
          const p = await fetchProfile(s.user.id)
          if (!mounted) return
          setSession(s); setProfile(p)
          setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        }
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    setPage('home'); setSession(null); setProfile(null)
    await supabase.auth.signOut()
  }

  // Kalau ada session tapi profile belum loaded, tampilkan loading ringan
  // TAPI hanya max 3 detik — setelah itu tetap tampil home
  const [profileTimeout, setProfileTimeout] = useState(false)
  useEffect(() => {
    if (session && !profile) {
      const t = setTimeout(() => setProfileTimeout(true), 3000)
      return () => clearTimeout(t)
    }
  }, [session, profile])

  // Tampilkan loading HANYA kalau: ada session, profile belum ada, belum timeout
  if (session && !profile && !profileTimeout) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{width:36,height:36,border:'3px solid #e5e7eb',borderTopColor:'#fbbf24',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
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
      {page === 'dashboard' && session && profile?.role !== 'admin' && <TenantDashboard profile={profile} onBack={()=>setPage('home')} onSignOut={signOut}/>}
      {page === 'admin'     && session && profile?.role === 'admin'  && <AdminDashboard  profile={profile} onBack={()=>setPage('home')} onSignOut={signOut}/>}
      {page === 'scanner'   && (
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