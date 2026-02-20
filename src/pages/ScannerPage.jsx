// src/pages/ScannerPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Halaman scanner QR — TIDAK perlu login.
// Bisa dibuka langsung dari HP lama via URL: http://localhost:5173/scanner
// atau dari URL Vercel: https://kostify-xxx.vercel.app/scanner
//
// Cara kerja:
// 1. Buka URL /scanner di HP lama
// 2. Tekan "Mulai Scan" → izinkan akses kamera
// 3. Arahkan ke QR Code penyewa
// 4. Hasil: AKSES DIBERIKAN ✅ atau AKSES DITOLAK ❌
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import {
  QrCode, CheckCircle, XCircle, User, Home, Calendar,
  RefreshCw, Camera, Shield, Wifi, WifiOff, Zap
} from 'lucide-react'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const fmtDate = s => s
  ? new Date(s).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
  : '—'

// Validate QR token langsung via Supabase (tanpa Edge Function auth)
const validateToken = async (token) => {
  try {
    // Langsung query Supabase dengan anon key
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token, method: 'hp_scanner' }),
    })
    if (!res.ok) throw new Error('Server error')
    return await res.json()
  } catch {
    // Fallback: query langsung ke Supabase kalau edge function belum di-deploy
    const { data } = await supabase
      .from('rentals')
      .select('*, profiles(full_name), rooms(room_number)')
      .eq('access_token', token)
      .single()

    if (!data) return { access: false, reason: 'QR tidak dikenali' }

    const expiry = new Date(data.expiry_date); expiry.setHours(23, 59, 59)
    const now    = new Date()

    if (data.status === 'active' && expiry >= now) {
      return {
        access:      true,
        reason:      'Akses diberikan',
        tenant_name: data.profiles?.full_name,
        room_number: data.rooms?.room_number,
        expiry_date: data.expiry_date,
      }
    }
    return {
      access: false,
      reason: expiry < now ? 'Masa sewa sudah berakhir' : 'Sewa tidak aktif',
    }
  }
}

export default function ScannerPage() {
  const [phase, setPhase]       = useState('idle')  // idle | scanning | checking | result
  const [result, setResult]     = useState(null)
  const [online, setOnline]     = useState(navigator.onLine)
  const [lastScan, setLastScan] = useState(null)
  const scannerRef              = useRef(null)
  const cooldownRef             = useRef(false) // prevent double scan

  // Network status
  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => { scannerRef.current?.clear().catch(() => {}) }
  }, [])

  const startScanner = () => {
    setPhase('scanning')
    setResult(null)
    cooldownRef.current = false

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 1,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          aspectRatio: 1.0,
        },
        false
      )

      scanner.render(
        async (decodedText) => {
          // Prevent processing duplicate scans within 2 seconds
          if (cooldownRef.current) return
          cooldownRef.current = true

          await scanner.clear().catch(() => {})
          scannerRef.current = null
          setPhase('checking')
          setLastScan(decodedText.slice(0, 8) + '...') // show partial token

          const data = await validateToken(decodedText)
          setResult(data)
          setPhase('result')

          // Auto-reset after 8 seconds
          setTimeout(() => {
            if (data.access) {
              // If granted, auto go back to idle faster
              setPhase('idle')
              setResult(null)
            }
          }, 8000)
        },
        (error) => {
          // Silent scan errors (normal when no QR in frame)
        }
      )
      scannerRef.current = scanner
    }, 100)
  }

  const reset = () => {
    scannerRef.current?.clear().catch(() => {})
    scannerRef.current = null
    setPhase('idle')
    setResult(null)
    cooldownRef.current = false
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d18 50%, #0a0f0a 100%)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header className="w-full max-w-md px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
            <span className="text-black font-black text-lg" style={{ fontFamily: 'Georgia, serif' }}>K</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Kostify</p>
            <p className="text-white/30 text-xs">Scanner Akses</p>
          </div>
        </div>

        {/* Online indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
          online ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {online ? <Wifi size={11}/> : <WifiOff size={11}/>}
          {online ? 'Online' : 'Offline'}
        </div>
      </header>

      <main className="w-full max-w-md px-4 pb-12 flex-1 flex flex-col">

        {/* ── IDLE: Start screen ── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            {/* QR frame illustration */}
            <div className="relative w-56 h-56 mb-8 mt-6">
              {/* Corner decorations */}
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute ${cls} w-12 h-12 border-amber-400`}/>
              ))}

              {/* Center content */}
              <div className="absolute inset-6 flex flex-col items-center justify-center gap-3">
                <QrCode size={52} className="text-white/10"/>
                <p className="text-white/20 text-xs text-center">Arahkan ke QR Code penyewa</p>
              </div>

              {/* Animated scan line */}
              <motion.div
                animate={{ y: [0, 180, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-3 right-3 top-3 h-0.5"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent)' }}
              />
            </div>

            <h1 className="text-white font-bold text-2xl text-center mb-2" style={{ fontFamily: 'Georgia,serif' }}>
              Siap Scan
            </h1>
            <p className="text-white/30 text-sm text-center mb-8 max-w-xs">
              Tekan tombol di bawah, izinkan akses kamera, lalu arahkan ke QR Code penyewa
            </p>

            <motion.button
              onClick={startScanner}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-bold text-black text-base flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              <Camera size={20}/>
              Mulai Scan QR
            </motion.button>

            <p className="text-white/15 text-xs text-center mt-4">
              Pastikan koneksi internet aktif saat scan
            </p>

            {lastScan && (
              <div className="mt-6 w-full p-3 rounded-xl bg-white/3 border border-white/5 text-center">
                <p className="text-white/20 text-xs">Scan terakhir: <span className="font-mono text-white/30">{lastScan}</span></p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SCANNING: Camera active ── */}
        {phase === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>
                <span className="text-white/60 text-sm font-medium">Kamera Aktif</span>
              </div>
              <button onClick={reset} className="text-white/30 hover:text-white text-sm transition-colors">
                Batal
              </button>
            </div>

            {/* Scanner container */}
            <div
              id="qr-reader"
              className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              style={{
                // Override html5-qrcode default styles
              }}
            />

            <p className="text-white/25 text-xs text-center mt-4">
              Pastikan QR Code terlihat jelas dan pencahayaan cukup
            </p>
          </motion.div>
        )}

        {/* ── CHECKING: Processing ── */}
        {phase === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/10"/>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin"/>
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-amber-400/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}/>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={26} className="text-amber-400/60"/>
              </div>
            </div>
            <p className="text-white font-bold text-lg mb-1">Memverifikasi...</p>
            <p className="text-white/30 text-sm">Mengecek ke server</p>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col"
          >
            {/* Result card */}
            <div className={`rounded-3xl overflow-hidden border mb-4 ${
              result.access
                ? 'border-emerald-500/30 shadow-2xl shadow-emerald-500/10'
                : 'border-red-500/25 shadow-2xl shadow-red-500/10'
            }`}
              style={{
                background: result.access
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(10,10,15,0.95))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(10,10,15,0.95))',
              }}
            >
              {/* Top section */}
              <div className={`p-8 text-center border-b ${result.access ? 'border-emerald-500/15' : 'border-red-500/15'}`}>
                <motion.div
                  initial={{ scale: 0, rotate: result.access ? -20 : 20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 ${
                    result.access ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'
                  }`}
                >
                  {result.access
                    ? <CheckCircle size={48} className="text-emerald-400" strokeWidth={1.5}/>
                    : <XCircle    size={48} className="text-red-400"     strokeWidth={1.5}/>
                  }
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`text-3xl font-black tracking-tight mb-1 ${result.access ? 'text-emerald-300' : 'text-red-300'}`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {result.access ? 'AKSES OK' : 'DITOLAK'}
                </motion.h2>
                <p className="text-white/40 text-sm">{result.reason}</p>
              </div>

              {/* Info rows (only on success) */}
              {result.access && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-5 flex flex-col gap-2.5"
                >
                  {result.tenant_name && (
                    <InfoRow icon={User} label="Penyewa" value={result.tenant_name} color="emerald"/>
                  )}
                  {result.room_number && (
                    <InfoRow icon={Home} label="Kamar" value={`Kamar ${result.room_number}`} color="emerald"/>
                  )}
                  {result.expiry_date && (
                    <InfoRow icon={Calendar} label="Berlaku s/d" value={fmtDate(result.expiry_date)} color="emerald"/>
                  )}
                  <div className="flex items-center gap-2 mt-1 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                    <Shield size={13} className="text-emerald-400 shrink-0"/>
                    <p className="text-emerald-400/70 text-xs">Akses tercatat di log sistem</p>
                  </div>
                </motion.div>
              )}

              {/* On reject - show icon */}
              {!result.access && (
                <div className="p-5 text-center">
                  <p className="text-white/25 text-sm">QR tidak valid, sudah kadaluarsa, atau bukan milik kamar ini.</p>
                </div>
              )}
            </div>

            {/* Auto-reset indicator */}
            {result.access && (
              <div className="text-center mb-3">
                <p className="text-white/20 text-xs">Otomatis reset dalam 8 detik...</p>
              </div>
            )}

            <motion.button
              onClick={reset}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl border border-white/10 bg-white/3 text-white/60 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={15}/>
              Scan Lagi
            </motion.button>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-white/10 text-xs">Kostify Scanner · Versi HP</p>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color==='emerald' ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
        <Icon size={14} className={color==='emerald' ? 'text-emerald-400' : 'text-white/40'}/>
      </div>
      <div>
        <p className="text-white/30 text-xs">{label}</p>
        <p className="text-white font-semibold text-sm">{value}</p>
      </div>
    </div>
  )
}
