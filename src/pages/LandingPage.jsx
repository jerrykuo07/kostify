// src/pages/LandingPage.jsx
// Sama seperti sebelumnya TAPI navbar berubah kalau sudah login:
// - Sebelum login: tombol "Masuk / Daftar" + "Pesan Sekarang"
// - Sesudah login:  tombol "Dashboard" (untuk penyewa) atau "Admin Panel"

import { useState, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi, Wind, Droplets, Tv, Coffee, ShieldCheck,
  Star, ChevronDown, ArrowRight, Menu, X,
  MapPin, Phone, Mail, Instagram, CheckCircle,
  Zap, Users, Key, Clock, LayoutDashboard, LogOut, User, Scan, Sun, Moon
} from 'lucide-react'


const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1800&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1800&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1800&q=80',
]

const ROOMS = [
  { id: 1, name: 'Kamar Standard', type: 'standard', price: 800000, floor: '1', size: '3×4 m²', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', facilities: ['AC', 'WiFi', 'Kamar Mandi Dalam'], badge: null },
  { id: 2, name: 'Kamar Deluxe',   type: 'deluxe',   price: 1200000, floor: '2', size: '4×5 m²', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80', facilities: ['AC', 'WiFi', 'Kamar Mandi Dalam', 'Balkon', 'TV'], badge: 'Terpopuler' },
  { id: 3, name: 'Kamar Suite',    type: 'suite',    price: 2000000, floor: '3', size: '5×6 m²', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', facilities: ['AC', 'WiFi', 'Kamar Mandi Dalam', 'Balkon', 'TV', 'Mini Kitchen'], badge: 'Premium' },
]

const FACILITIES = [
  { icon: Wifi,        label: 'WiFi Super Cepat',   desc: '100 Mbps fiber optik' },
  { icon: Wind,        label: 'AC di Setiap Kamar', desc: 'AC split 1 PK, remote control' },
  { icon: Droplets,    label: 'Air Panas 24 Jam',   desc: 'Water heater elektrik' },
  { icon: ShieldCheck, label: 'Keamanan 24 Jam',    desc: 'CCTV + akses QR pintu otomatis' },
  { icon: Coffee,      label: 'Dapur Bersama',       desc: 'Lengkap dengan peralatan masak' },
  { icon: Tv,          label: 'Ruang Santai',        desc: 'TV 55" + sofa nyaman' },
]

const TESTIMONIALS = [
  { name: 'Andi Pratama', job: 'Software Engineer', stars: 5, text: 'Kamarnya bersih, AC dingin, WiFi cepat banget. Sistem QR-nya canggih, ga perlu bawa kunci fisik. Sangat rekomendasikan!' },
  { name: 'Sari Dewi',    job: 'Mahasiswi UI',      stars: 5, text: 'Lokasi strategis, owner responsif. Bayar sewa bisa lewat QRIS, gampang banget. Sudah 2 tahun disini, betah!' },
  { name: 'Budi Laksono', job: 'Fresh Graduate',    stars: 5, text: 'Untuk harganya, fasilitasnya luar biasa. Kamar mandi dalam, balkon view kota. Berasa tinggal di apartemen!' },
]

export default function LandingPage({ session, profile, onBookNow, onGoToDashboard, onGoToAdmin, onGoToScanner, onSignOut }) {
  const { dark, toggle } = useTheme()
  const [heroIndex, setHeroIndex] = useState(0)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isLoggedIn = !!session
  const isAdmin    = profile?.role === 'admin'

  useEffect(() => {
    const interval = setInterval(() => setHeroIndex(i => (i + 1) % HERO_IMAGES.length), 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-black font-bold text-base">K</span>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-xl font-semibold text-white">Kostify</span>
          </motion.div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {[['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Testimoni', 'testimonials'], ['Lokasi', 'location']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm text-white/60 hover:text-white transition-colors tracking-wide">{label}</button>
            ))}
          </nav>

          {/* Right actions */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              /* ── Sudah login ── */
              <div className="flex items-center gap-3">
                {/* Dashboard / Admin button */}
                <button
                  onClick={isAdmin ? onGoToAdmin : onGoToDashboard}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm font-medium transition-all"
                >
                  <LayoutDashboard size={15} />
                  {isAdmin ? 'Admin Panel' : 'Dashboard'}
                </button>

                {/* User avatar + dropdown */}
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="text-white/70 text-sm max-w-24 truncate">{profile?.full_name?.split(' ')[0] ?? 'Akun'}</span>
                    <ChevronDown size={13} className={`text-white/30 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-white text-sm font-semibold truncate">{profile?.full_name}</p>
                          <p className="text-white/30 text-xs mt-0.5">{isAdmin ? 'Administrator' : 'Penyewa'}</p>
                        </div>
                        <div className="p-2">
                          <button onClick={() => { setUserMenuOpen(false); isAdmin ? onGoToAdmin() : onGoToDashboard() }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm text-left">
                            <LayoutDashboard size={14} />
                            {isAdmin ? 'Admin Panel' : 'Dashboard Saya'}
                          </button>
                          {isAdmin && onGoToScanner && (
                            <button onClick={() => { setUserMenuOpen(false); onGoToScanner() }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm text-left">
                              <Scan size={14} />
                              Scanner QR
                            </button>
                          )}
                          <button onClick={() => { setUserMenuOpen(false); onSignOut() }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm text-left">
                            <LogOut size={14} />
                            Keluar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* ── Belum login ── */
              <div className="flex items-center gap-2">
                <button onClick={toggle} className="p-2 rounded-lg bg-white/5 border border-white/10 text-amber-400 hover:bg-white/10 transition-all">
                  {dark ? <Sun size={15}/> : <Moon size={15}/>}
                </button>
                <button onClick={onBookNow}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02]">
                  Masuk / Daftar <ArrowRight size={14} />
                </button>
              </div>
            )}
          </motion.div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0f0f0f] border-t border-white/5">
              <div className="px-6 py-5 flex flex-col gap-3">
                {[['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Testimoni', 'testimonials'], ['Lokasi', 'location']].map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id)} className="text-left text-white/60 hover:text-white py-1 text-sm">{label}</button>
                ))}
                <div className="border-t border-white/5 pt-3 mt-1">
                  {isLoggedIn ? (
                    <>
                      <button onClick={() => { setMenuOpen(false); isAdmin ? onGoToAdmin() : onGoToDashboard() }}
                        className="w-full flex items-center gap-2 py-3 rounded-xl bg-white/5 text-white font-medium text-sm justify-center mb-2">
                        <LayoutDashboard size={15} /> {isAdmin ? 'Admin Panel' : 'Dashboard Saya'}
                      </button>
                      <button onClick={() => { setMenuOpen(false); onSignOut() }}
                        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 font-medium text-sm">
                        Keluar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setMenuOpen(false); onBookNow() }}
                      className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold text-sm flex items-center justify-center gap-2">
                      Masuk / Daftar <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div key={heroIndex} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="absolute inset-0">
            <img src={HERO_IMAGES[heroIndex]} alt="" className="w-full h-full object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent z-10" />

        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs font-medium tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Kost Premium · Akses QR Otomatis
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ fontFamily: "'Playfair Display', serif" }} className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Hunian Nyaman,<br /><span className="italic text-amber-300">Hidup Lebih Tenang</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-white/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Kost eksklusif dengan teknologi akses QR, pembayaran digital, dan fasilitas setara apartemen. Mulai dari Rp 800rb/bulan.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* CTA utama */}
            <button onClick={isLoggedIn ? (isAdmin ? onGoToAdmin : onGoToDashboard) : onBookNow}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-base transition-all shadow-2xl shadow-amber-500/30 hover:scale-[1.03]">
              {isLoggedIn
                ? <><LayoutDashboard size={18} />{isAdmin ? 'Buka Admin Panel' : 'Buka Dashboard Saya'}</>
                : <>Pesan Kamar Sekarang <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              }
            </button>
            <button onClick={() => scrollTo('rooms')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-base font-medium transition-all backdrop-blur-sm">
              Lihat Kamar
            </button>
          </motion.div>

          {/* Stats */}
          {isLoggedIn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-10 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-sm font-medium">
                Selamat datang kembali, <strong>{profile?.full_name?.split(' ')[0]}</strong>! 👋
              </span>
            </motion.div>
          )}

          {!isLoggedIn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="mt-14 grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {[['10+', 'Kamar Tersedia'], ['200+', 'Penyewa Puas'], ['3th+', 'Berpengalaman']].map(([val, lbl]) => (
                <div key={lbl} className="text-center">
                  <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-bold text-amber-300">{val}</p>
                  <p className="text-white/40 text-xs mt-0.5">{lbl}</p>
                </div>
              ))}
            </motion.div>
          )}
        

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <span className="text-white/30 text-xs tracking-widest uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={18} className="text-white/30" />
          </motion.div>
        </motion.div>

        {/* Slideshow dots */}
        <div className="absolute bottom-8 right-8 z-20 flex gap-2">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)}
              className={`transition-all duration-300 rounded-full ${i === heroIndex ? 'w-6 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-white/30'}`} />
          ))}
        </div>
        </div>
      </section>

      {/* ── KENAPA KAMI ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Mengapa Kostify?</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                Bukan Sekadar<br />Tempat Tinggal
              </h2>
              <p className="text-white/50 leading-relaxed mb-8">Kostify dirancang untuk profesional muda dan mahasiswa yang menginginkan kenyamanan premium tanpa harga selangit.</p>
              <div className="flex flex-col gap-4">
                {[
                  { icon: Key,   text: 'Akses pintu otomatis via QR Code — tanpa kunci fisik' },
                  { icon: Zap,   text: 'Bayar sewa kapan saja via transfer, QRIS, atau e-wallet' },
                  { icon: Clock, text: 'Notifikasi otomatis saat sewa mendekati jatuh tempo' },
                  { icon: Users, text: 'Komunitas penghuni yang friendly dan suasana kondusif' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={14} className="text-amber-400" />
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="relative h-[480px]">
                <div className="absolute top-0 right-0 w-[65%] h-[55%] rounded-3xl overflow-hidden shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 left-0 w-[58%] h-[50%] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#0a0a0a]">
                  <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-12 right-4 bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 shadow-2xl w-40">
                  <div className="flex items-center gap-1 mb-1">{[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}</div>
                  <p className="text-white font-semibold text-sm">4.9/5.0</p>
                  <p className="text-white/40 text-xs">dari 200+ ulasan</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── KAMAR ──────────────────────────────────────────────────────────── */}
      <section id="rooms" className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Pilihan Kamar</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl lg:text-5xl font-bold text-white mb-4">Temukan Kamar Impian Anda</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {ROOMS.map((room, i) => <RoomCard key={room.id} room={room} delay={i * 0.1} onBook={isLoggedIn ? (isAdmin ? onGoToAdmin : onGoToDashboard) : onBookNow} isLoggedIn={isLoggedIn} />)}
          </div>
        </div>
      </section>

      {/* ── FASILITAS ──────────────────────────────────────────────────────── */}
      <section id="facilities" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Fasilitas</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl font-bold text-white mb-4">Semua Yang Anda Butuhkan</h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {FACILITIES.map(({ icon: Icon, label, desc }, i) => (
              <FadeIn key={label} delay={i * 0.07}>
                <div className="group p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-400/20 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center mb-4 group-hover:bg-amber-400/15 transition-colors">
                    <Icon size={22} className="text-amber-400" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1">{label}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONI ──────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Testimoni</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl font-bold text-white">Kata Mereka yang Sudah Tinggal</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, job, stars, text }, i) => (
              <FadeIn key={name} delay={i * 0.1}>
                <div className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-400/10 transition-all">
                  <div className="flex gap-0.5 mb-4">{[...Array(stars)].map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}</div>
                  <p className="text-white/60 text-sm leading-relaxed mb-5 italic">"{text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm">{name[0]}</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{name}</p>
                      <p className="text-white/30 text-xs">{job}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOKASI ─────────────────────────────────────────────────────────── */}
      <section id="location" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Lokasi Strategis</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl font-bold text-white mb-6">
                Dekat ke Mana-mana,<br /><span className="italic text-amber-300">Jauh dari Kebisingan</span>
              </h2>
              <div className="flex flex-col gap-4 mb-8">
                {[
                  { icon: MapPin, text: 'Jl. Contoh No. 123, Kota Anda' },
                  { icon: Phone,  text: '+62 812 3456 7890 (WhatsApp)' },
                  { icon: Mail,   text: 'info@kostify.id' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon size={16} className="text-amber-400 shrink-0" />
                    <span className="text-white/60 text-sm">{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={isLoggedIn ? (isAdmin ? onGoToAdmin : onGoToDashboard) : onBookNow}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-all">
                {isLoggedIn ? 'Buka Dashboard' : 'Pesan Kamar'} <ArrowRight size={14} />
              </button>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="h-72 md:h-96 rounded-3xl overflow-hidden border border-white/5">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126748.61516263398!2d106.75366849516602!3d-6.229728541700494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x5371bf0fdad786a2!2sJakarta!5e0!3m2!1sen!2sid!4v1710000000000!5m2!1sen!2sid"
                  width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} allowFullScreen loading="lazy" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="p-12 rounded-3xl border border-amber-400/15 bg-gradient-to-br from-amber-950/30 to-transparent relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-400/10 blur-3xl rounded-full" />
              <p className="relative text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">Kamar Terbatas!</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="relative text-4xl font-bold text-white mb-4">Mulai Hidup Nyaman<br />Hari Ini</h2>
              <p className="relative text-white/50 mb-8">Daftar sekarang dan nikmati sistem kost paling modern di kota Anda.</p>
              <button onClick={isLoggedIn ? (isAdmin ? onGoToAdmin : onGoToDashboard) : onBookNow}
                className="relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-base transition-all shadow-2xl shadow-amber-500/20 hover:scale-[1.03]">
                {isLoggedIn ? 'Buka Dashboard' : 'Pesan Kamar Sekarang'} <ArrowRight size={18} />
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-black font-bold text-sm">K</span>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-white font-semibold">Kostify</span>
          </div>
          <p className="text-white/20 text-sm">© {new Date().getFullYear()} Kostify. Sistem Manajemen Kost Modern.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/30 hover:text-amber-400 transition-colors"><Instagram size={18} /></a>
            <a href="#" className="text-white/30 hover:text-amber-400 transition-colors text-sm">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  )
}

function RoomCard({ room, delay, onBook, isLoggedIn }) {
  const facilityIcons = { 'AC': Wind, 'WiFi': Wifi, 'TV': Tv, 'Balkon': Star, 'Mini Kitchen': Coffee }
  return (
    <FadeIn delay={delay}>
      <div className="group rounded-3xl bg-[#111] border border-white/5 hover:border-amber-400/20 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5">
        <div className="relative h-52 overflow-hidden">
          <img src={room.image} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
          {room.badge && <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-bold">{room.badge}</div>}
          <div className="absolute bottom-4 left-4 text-white/60 text-xs">{room.size} · Lantai {room.floor}</div>
        </div>
        <div className="p-6">
          <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-xl font-semibold text-white mb-1">{room.name}</h3>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold text-amber-400">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price)}</span>
            <span className="text-white/30 text-sm">/bulan</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {room.facilities.map(f => {
              const Icon = facilityIcons[f]
              return <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-xs">{Icon && <Icon size={10} />} {f}</span>
            })}
          </div>
          <button onClick={onBook}
            className="w-full py-3 rounded-xl border border-amber-400/30 text-amber-400 hover:bg-amber-400 hover:text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 group">
            {isLoggedIn ? 'Lihat Dashboard' : 'Pesan Kamar Ini'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </FadeIn>
  )
}