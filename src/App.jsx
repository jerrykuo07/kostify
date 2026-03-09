import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

function AppInner() {
  const [session, setSession]     = useState(null)
  const [profile, setProfile]     = useState(null)
  const [page, setPage]           = useState('home')
  const [showAuth, setShowAuth]   = useState(false)
  const [authReady, setAuthReady] = useState(false)

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      return data ?? null
    } catch { return null }
  }

  useEffect(() => {
    let mounted = true
    let ready = false

    const markReady = () => {
      if (!ready && mounted) { ready = true; setAuthReady(true) }
    }

    // Hard fallback — show app no matter what after 5s
    const fallback = setTimeout(markReady, 5000)

    // --- SHORTCUT: cek session langsung tanpa tunggu event ---
    // Ini fix untuk hard reload (ctrl+shift+r) dimana onAuthStateChange lambat
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted || ready) return
      if (!s) {
        // Tidak ada session — langsung tampil landing
        setSession(null); setProfile(null); setPage('home')
        markReady()
      } else {
        // Ada session — load profile dan tampil dashboard
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        markReady()
      }
    })

    // --- EVENT LISTENER: handle perubahan auth state (login/logout) ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      console.log('[App] event:', event, '| user:', s?.user?.email ?? 'none')

      if (event === 'INITIAL_SESSION') {
        // Sudah ditangani oleh getSession() di atas
        // Tapi tetap markReady sebagai safety net
        markReady()
        return
      }

      if (event === 'SIGNED_IN' && s) {
        clearTimeout(fallback)
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p); setShowAuth(false)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        markReady()
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setPage('home')
        markReady()
        return
      }

      if (event === 'TOKEN_REFRESHED' && s) {
        setSession(s)
        markReady()
      }
    })

    return () => { mounted = false; clearTimeout(fallback); subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    setPage('home'); setSession(null); setProfile(null)
    await supabase.auth.signOut()
  }

  if (!authReady) return (
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