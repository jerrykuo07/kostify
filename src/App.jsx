import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import LandingPage     from './pages/LandingPage'
import AuthModal       from './components/AuthModal'
import TenantDashboard from './pages/TenantDashboard'
import AdminDashboard  from './pages/AdminDashboard'
import ScannerPage     from './pages/ScannerPage'

export default function App() {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [page, setPage]         = useState('home')
  const [showAuth, setShowAuth] = useState(false)
  const [dbError, setDbError]   = useState(null)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Profile fetch error:', error)
        setDbError(error.message)
        return null
      }
      setDbError(null)
      return data
    } catch (e) {
      console.error('Profile fetch exception:', e)
      setDbError(e.message)
      return null
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) return
      setSession(s)
      fetchProfile(s.user.id).then(p => {
        setProfile(p)
        if (p?.role === 'admin') setPage('admin')
        else if (p) setPage('dashboard')
        // kalau p null (error db), tetap di home - jangan blank
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' && s) {
        setSession(s)
        fetchProfile(s.user.id).then(p => {
          setProfile(p)
          setShowAuth(false)
          if (p?.role === 'admin') setPage('admin')
          else setPage('dashboard')
        })
      }
      if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setPage('home'); setDbError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => {
    supabase.auth.signOut()
    setSession(null); setProfile(null); setPage('home'); setDbError(null)
  }

  const goTo = (p) => setPage(p)

  const landingProps = {
    session, profile,
    onBookNow:       () => session ? goTo(profile?.role === 'admin' ? 'admin' : 'dashboard') : setShowAuth(true),
    onGoToDashboard: () => goTo('dashboard'),
    onGoToAdmin:     () => goTo('admin'),
    onGoToScanner:   () => goTo('scanner'),
    onSignOut:       signOut,
  }

  return (
    <React.Fragment>
      {/* Banner error DB - muncul di atas kalau ada masalah Supabase */}
      {dbError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#7f1d1d', color: '#fca5a5', padding: '10px 20px',
          fontSize: '13px', fontFamily: 'monospace', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>⚠️ Database error: {dbError} — Jalankan FIX_500_ERROR.sql di Supabase SQL Editor</span>
          <button onClick={() => setDbError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {page === 'home' && (
          <Fade key="home"><LandingPage {...landingProps} /></Fade>
        )}

        {page === 'dashboard' && session && profile && profile.role !== 'admin' && (
          <Fade key="dash">
            <TenantDashboard profile={profile} onBack={() => goTo('home')} onSignOut={signOut} />
          </Fade>
        )}

        {page === 'admin' && session && profile?.role === 'admin' && (
          <Fade key="admin">
            <AdminDashboard profile={profile} onBack={() => goTo('home')} onSignOut={signOut} />
          </Fade>
        )}

        {page === 'scanner' && (
          <Fade key="scanner">
            <div className="min-h-screen bg-slate-950">
              <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 h-14 flex items-center">
                <button onClick={() => goTo(profile?.role === 'admin' ? 'admin' : 'home')}
                  className="text-white/40 hover:text-white text-sm transition-colors">
                  ← Kembali
                </button>
              </div>
              <ScannerPage />
            </div>
          </Fade>
        )}

        {/* Fallback: page tidak cocok → home */}
        {!['home','dashboard','admin','scanner'].includes(page) && (
          <Fade key="fb"><LandingPage {...landingProps} /></Fade>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
        )}
      </AnimatePresence>
    </React.Fragment>
  )
}

const Fade = ({ children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    {children}
  </motion.div>
)
