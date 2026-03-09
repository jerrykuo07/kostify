import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

function AppInner() {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [page, setPage]         = useState('home')
  const [showAuth, setShowAuth] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [dbError, setDbError]   = useState(null)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) { setDbError(error.message); return null }
      setDbError(null); return data
    } catch(e) { setDbError(e.message); return null }
  }

  useEffect(() => {
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      console.log('[App] event:', event, '| user:', s?.user?.email ?? 'none')

      if (event === 'INITIAL_SESSION') {
        if (!s) { setSession(null); setProfile(null); setPage('home'); setAuthReady(true); return }
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        setAuthReady(true)
        return
      }
      if (event === 'SIGNED_IN' && s) {
        const p = await fetchProfile(s.user.id)
        if (!mounted) return
        setSession(s); setProfile(p); setShowAuth(false)
        setPage(p?.role === 'admin' ? 'admin' : 'dashboard')
        return
      }
      if (event === 'SIGNED_OUT') { setSession(null); setProfile(null); setPage('home') }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    setPage('home'); setSession(null); setProfile(null)
    await supabase.auth.signOut()
  }

  const goTo = p => setPage(p)

  if (!authReady) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{width:36,height:36,border:'3px solid #e5e7eb',borderTopColor:'#fbbf24',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const landingProps = {
    session, profile,
    onBookNow:       () => session ? goTo(profile?.role==='admin'?'admin':'dashboard') : setShowAuth(true),
    onGoToDashboard: () => goTo('dashboard'),
    onGoToAdmin:     () => goTo('admin'),
    onGoToScanner:   () => goTo('scanner'),
    onSignOut:       signOut,
  }

  return (
    <React.Fragment>
      {dbError && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#7f1d1d',color:'#fca5a5',padding:'10px 20px',fontSize:'13px',fontFamily:'monospace',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>⚠️ Database error: {dbError}</span>
          <button onClick={()=>setDbError(null)} style={{background:'none',border:'none',color:'#fca5a5',cursor:'pointer',fontSize:'16px'}}>×</button>
        </div>
      )}

      {page === 'home' && <LandingPage {...landingProps}/>}
      {page === 'dashboard' && session && profile?.role !== 'admin' && <TenantDashboard profile={profile} onBack={()=>goTo('home')} onSignOut={signOut}/>}
      {page === 'admin' && session && profile?.role === 'admin' && <AdminDashboard profile={profile} onBack={()=>goTo('home')} onSignOut={signOut}/>}
      {page === 'scanner' && (
        <div className="min-h-screen bg-slate-950">
          <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 h-14 flex items-center">
            <button onClick={()=>goTo(profile?.role==='admin'?'admin':'home')} className="text-white/40 hover:text-white text-sm">← Kembali</button>
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