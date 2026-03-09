// src/pages/TenantDashboard.jsx — v3: multi-room, profile edit, theme support
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext.jsx'
import BookingModal from '../components/BookingModal'
import {
  Home, QrCode, CreditCard, Clock, Shield, ChevronRight,
  ArrowLeft, LogOut, Bell, CheckCircle, AlertCircle,
  Wifi, Zap, Droplets, Star, Receipt, Minus, Plus, X,
  User, ClipboardList, PlusCircle, Edit3, Lock, Eye, EyeOff, Save,
  Sun, Moon, Maximize2
} from 'lucide-react'

const SERIF  = 'Georgia,serif'
const fmtIDR = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n??0)
const fmtD   = s => s ? new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'
const daysLeft = d => d ? Math.ceil((new Date(d)-new Date())/86400000) : 0

export default function TenantDashboard({ profile: initProfile, onBack, onSignOut, onProfileLoad }) {
  const { dark, toggle } = useTheme()
  const [profile, setProfile] = useState(initProfile)
  const [rentals, setRentals]   = useState([])
  const [payments, setPay]      = useState([])
  const [bookings, setBook]     = useState([])
  const [rooms, setRooms]       = useState([])
  const [loading, setLoad]      = useState(true)
  const [tab, setTab]           = useState('overview')
  const [showPay, setShowPay]   = useState(null) // rental object
  const [showBook, setShowBook] = useState(false)

  const [qrFullscreen, setQrFullscreen] = useState(null)

  // Derived: all active rentals
  const activeRentals = rentals.filter(r => r.status==='active' && new Date(r.expiry_date)>=new Date())

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    full_name: initProfile?.full_name||'',
    phone:     initProfile?.phone||'',
    ktp_number: initProfile?.ktp_number||'',
    occupation: initProfile?.occupation||'',
    new_email:  '',
  })
  const [pwdForm, setPwdForm]         = useState({ new:'', confirm:'' })
  const [showPwd, setShowPwd]         = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd]     = useState(false)
  const [profileMsg, setProfileMsg]   = useState('')
  const [pwdMsg, setPwdMsg]           = useState('')

  // Theme classes
  const bg  = dark ? 'bg-[#0a0a0a]' : 'bg-gray-50'
  const hdr = dark ? 'bg-[#0a0a0a]/90 border-white/5' : 'bg-white/90 border-gray-200'
  const txt = dark ? 'text-white' : 'text-gray-900'
  const sub = dark ? 'text-white/40' : 'text-gray-500'
  const crd = dark ? 'bg-[#111] border-white/8' : 'bg-white border-gray-200'
  const inp = dark ? 'bg-white/5 border-white/10 text-white placeholder-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'

  // Self-fetch profile kalau belum ada (misal setelah hard reload)
  useEffect(() => {
    if (!initProfile) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (p) {
          setProfile(p)
          if (onProfileLoad) onProfileLoad(p)
        }
      })
    }
  }, [])

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const k = import.meta.env.VITE_MIDTRANS_CLIENT_KEY
    if (!k || document.querySelector('script[src*="snap.js"]')) return
    const s = document.createElement('script')
    s.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    s.setAttribute('data-client-key', k); s.async = true; document.body.appendChild(s)
  }, [])

  const loadData = async () => {
    setLoad(true)
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('rentals').select('*,rooms(*)').eq('tenant_id', initProfile.id).order('created_at',{ascending:false}),
      supabase.from('payments').select('*').eq('tenant_id', initProfile.id).order('created_at',{ascending:false}).limit(20),
      supabase.from('booking_requests').select('*,rooms(room_number,type,floor,price_monthly)').eq('tenant_id', initProfile.id).order('created_at',{ascending:false}),
      supabase.from('rooms').select('*').eq('status','available').order('room_number'),
    ])
    setRentals(r1.data??[]); setPay(r2.data??[]); setBook(r3.data??[]); setRooms(r4.data??[])
    setLoad(false)
  }

  // Active rental = first active one
  const activeRental = rentals.find(r => r.status==='active' && new Date(r.expiry_date)>=new Date()) // first active rental
  const pendingPayRental = rentals.find(r => r.status==='pending_payment')
  const pendingBooking = bookings.find(b => b.status==='pending')
  const approvedBooking = bookings.find(b => b.status==='approved')

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg('')
    const updates = { full_name:profileForm.full_name, phone:profileForm.phone, ktp_number:profileForm.ktp_number, occupation:profileForm.occupation }
    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (error) setProfileMsg('❌ '+error.message)
    else { setProfileMsg('✅ Profil berhasil diperbarui!'); setProfile(p=>({...p,...updates})) }
    setSavingProfile(false)
  }

  const changeEmail = async () => {
    const email = profileForm.new_email.trim()
    if (!email || !email.includes('@')) { setProfileMsg('❌ Email tidak valid'); return }
    setSavingProfile(true); setProfileMsg('')
    const { error } = await supabase.auth.updateUser({ email })
    if (error) setProfileMsg('❌ '+error.message)
    else {
      setProfileMsg('✅ Email verifikasi dikirim ke '+email+'. Silakan cek inbox lalu login ulang.')
      setTimeout(async () => { await supabase.auth.signOut(); onSignOut() }, 3000)
    }
    setSavingProfile(false)
  }

  const savePassword = async () => {
    if (pwdForm.new !== pwdForm.confirm) { setPwdMsg('❌ Password tidak cocok'); return }
    if (pwdForm.new.length < 6) { setPwdMsg('❌ Min. 6 karakter'); return }
    setSavingPwd(true); setPwdMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwdForm.new })
    if (error) { setPwdMsg('❌ '+error.message); setSavingPwd(false); return }
    setPwdMsg('✅ Password berhasil diubah! Silakan login ulang...')
    setTimeout(async () => { await supabase.auth.signOut(); onSignOut() }, 2000)
    setSavingPwd(false)
  }

  if (loading) return (
    <div className={`min-h-screen ${bg}`}>
      <div className={`sticky top-0 z-40 ${hdr} backdrop-blur-xl border-b px-5 h-16 flex items-center justify-between max-w-5xl mx-auto`}>
        <button onClick={onBack} className={`${sub} text-sm`}>← Beranda</button>
        <div className={`w-20 h-4 ${dark?'bg-white/5':'bg-gray-200'} rounded animate-pulse`}/>
        <div className={`w-14 h-4 ${dark?'bg-white/5':'bg-gray-200'} rounded animate-pulse`}/>
      </div>
      <div className="max-w-5xl mx-auto px-5 py-7 grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className={`lg:col-span-2 h-52 rounded-3xl ${dark?'bg-white/3':'bg-gray-100'} animate-pulse`}/>
        <div className="flex flex-col gap-4">
          <div className={`h-36 rounded-3xl ${dark?'bg-white/3':'bg-gray-100'} animate-pulse`}/>
          <div className={`h-36 rounded-3xl ${dark?'bg-white/3':'bg-gray-100'} animate-pulse`}/>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg}`} style={{fontFamily:'DM Sans,system-ui,sans-serif'}}>
      <header className={`sticky top-0 z-40 ${hdr} backdrop-blur-xl border-b`}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={onBack} className={`flex items-center gap-2 ${sub} hover:${txt} text-sm transition-colors`}><ArrowLeft size={15}/> Beranda</button>
          <span style={{fontFamily:SERIF}} className={`${txt} font-semibold text-sm`}>Kostify</span>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className={`p-2 rounded-lg ${dark?'bg-white/5 text-amber-400':'bg-gray-100 text-amber-500'} transition-colors`}>{dark?<Sun size={14}/>:<Moon size={14}/>}</button>
            <button onClick={onSignOut} className={`flex items-center gap-1.5 ${sub} hover:text-red-400 text-sm transition-colors`}><LogOut size={14}/> Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-7 pb-24">
        <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="mb-6">
          <p className={`${sub} text-sm`}>Dashboard Sewa</p>
          <h1 style={{fontFamily:SERIF}} className={`text-3xl font-bold ${txt} mt-0.5`}>Halo, <span className="italic text-amber-300">{profile?.full_name?.split(' ')[0]}</span> 👋</h1>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence>
          {activeRental && daysLeft(activeRental.expiry_date)<=7 && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4">
              <Bell size={17} className="text-amber-400 animate-pulse"/>
              <div className="flex-1"><p className="text-amber-300 font-semibold text-sm">Sewa berakhir {daysLeft(activeRental.expiry_date)} hari lagi!</p><p className="text-amber-400/50 text-xs">Segera perpanjang</p></div>
              <button onClick={()=>setShowPay(activeRental)} className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold">Perpanjang</button>
            </motion.div>
          )}
          {pendingBooking && !activeRental && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-4">
              <ClipboardList size={17} className="text-indigo-400"/>
              <div className="flex-1"><p className="text-indigo-300 font-semibold text-sm">Permintaan sedang diproses</p><p className="text-indigo-400/50 text-xs">Kamar {pendingBooking.rooms?.room_number} · Menunggu approval</p></div>
              <button onClick={()=>setTab('booking')} className="text-indigo-400 text-xs underline">Lihat</button>
            </motion.div>
          )}
          {(approvedBooking && !activeRental) || pendingPayRental ? (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-4">
              <CheckCircle size={17} className="text-emerald-400"/>
              <div className="flex-1"><p className="text-emerald-300 font-semibold text-sm">Disetujui! Silakan bayar</p><p className="text-emerald-400/50 text-xs">Kamar {approvedBooking?.rooms?.room_number}</p></div>
              <button onClick={()=>setShowPay({rental:pendingPayRental||activeRental,months:approvedBooking?.duration_months||1})} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold">Bayar</button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 ${dark?'bg-white/5 border-white/8':'bg-gray-100 border-gray-200'} border rounded-2xl mb-5 overflow-x-auto`}>
          {[
            {id:'overview', l:'Ringkasan', I:Home},
            {id:'qr',       l:'QR Akses',  I:QrCode},
            {id:'booking',  l:'Pemesanan', I:ClipboardList, b:bookings.filter(x=>x.status==='pending').length},
            {id:'history',  l:'Riwayat',   I:Receipt},
            {id:'profile',  l:'Profil',    I:User},
          ].map(({id,l,I,b})=>(
            <button key={id} onClick={()=>setTab(id)} className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab===id?'bg-amber-400 text-black':dark?'text-white/40 hover:text-white':'text-gray-500 hover:text-gray-900'}`}>
              <I size={13}/>{l}
              {b>0&&<span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${tab===id?'bg-black/20 text-black':'bg-amber-400 text-black'}`}>{b}</span>}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==='overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {activeRental ? (
              <>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-white/8 min-h-52">
                  <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15"/>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#0d0d0d]/85 to-transparent"/>
                  <div className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div><p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">Kamar Anda</p><h2 style={{fontFamily:SERIF}} className="text-4xl font-bold text-white">{activeRental.rooms?.room_number}</h2><p className="text-white/40 text-sm capitalize">Lantai {activeRental.rooms?.floor} · {activeRental.rooms?.type}</p></div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-xs font-bold"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Aktif</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[['Mulai',fmtD(activeRental.start_date),false],['Berakhir',fmtD(activeRental.expiry_date),daysLeft(activeRental.expiry_date)<=7],['Sisa',`${Math.max(0,daysLeft(activeRental.expiry_date))} hari`,daysLeft(activeRental.expiry_date)<=7]].map(([l,v,hl])=>(
                        <div key={l} className="p-3 rounded-xl bg-white/5 border border-white/5"><p className="text-white/30 text-xs mb-0.5">{l}</p><p className={`font-semibold text-sm ${hl?'text-amber-400':'text-white'}`}>{v}</p></div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">{activeRental.rooms?.facilities?.map((f,i)=><span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/50 text-xs">{f.includes('WiFi')?<Wifi size={10}/>:f.includes('AC')?<Zap size={10}/>:f.includes('Mandi')?<Droplets size={10}/>:<Star size={10}/>}{f}</span>)}</div>
                  </div>
                </motion.div>
                <div className="flex flex-col gap-4">
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.1}} className={`p-5 rounded-3xl border ${crd}`}>
                    <p className={`${sub} text-xs uppercase tracking-widest mb-2`}>Harga Sewa</p>
                    <p style={{fontFamily:SERIF}} className="text-2xl font-bold text-amber-400">{fmtIDR(activeRental.monthly_price??activeRental.rooms?.price_monthly)}</p>
                    <p className={`${sub} text-xs`}>/bulan</p>
                  </motion.div>
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.15}} className={`p-5 rounded-3xl border ${crd}`}>
                    <p className={`${sub} text-xs uppercase tracking-widest mb-3`}>Aksi Cepat</p>
                    <div className="flex flex-col gap-2">
                      {[{I:QrCode,l:'Lihat QR Akses',fn:()=>setTab('qr'),a:false},{I:CreditCard,l:'Perpanjang Sewa',fn:()=>setShowPay(activeRental),a:true},{I:Receipt,l:'Riwayat Bayar',fn:()=>setTab('history'),a:false}].map(({I,l,fn,a})=>(
                        <button key={l} onClick={fn} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all w-full text-left group ${a?'bg-amber-400/8 border-amber-400/20 text-amber-400':dark?'bg-white/3 border-white/5 text-white/40 hover:text-white':'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-900'}`}><I size={14}/><span className="text-sm font-medium flex-1">{l}</span><ChevronRight size={13} className="opacity-40 group-hover:opacity-100"/></button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </>
            ) : (
              <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} className="lg:col-span-3 text-center py-14">
                <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto mb-5 ${crd}`}><Home size={32} className={`${sub}`}/></div>
                <h3 style={{fontFamily:SERIF}} className={`text-2xl font-bold ${txt} mb-2`}>Belum Ada Kamar</h3>
                <p className={`${sub} text-sm max-w-xs mx-auto mb-6`}>{pendingBooking?'Permintaan Anda sedang ditinjau admin.':'Pesan kamar dan mulai hunian nyaman Anda.'}</p>
                {!pendingBooking && <button onClick={()=>setShowBook(true)} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm"><PlusCircle size={16}/> Pesan Kamar Sekarang</button>}
                {pendingBooking && <button onClick={()=>setTab('booking')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-indigo-500/30 text-indigo-400 text-sm"><ClipboardList size={15}/> Lihat Status Permintaan</button>}
              </motion.div>
            )}

            {/* All rentals history */}
            {rentals.length > 1 && (
              <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="lg:col-span-3">
                <h3 className={`${txt} font-semibold mb-3 text-sm`}>Semua Kamar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rentals.map(r => {
                    const dl = daysLeft(r.expiry_date)
                    const isAct = r.status==='active' && dl>=0
                    return (
                      <div key={r.id} className={`p-4 rounded-2xl border ${isAct?'bg-emerald-500/5 border-emerald-500/20':dark?'bg-white/3 border-white/8':'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`${txt} font-semibold`}>Kamar {r.rooms?.room_number}</p>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isAct?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':r.status==='pending_payment'?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-slate-500/10 text-slate-400 border-slate-700'} border`}>
                            {isAct?'Aktif':r.status==='pending_payment'?'Belum Bayar':'Berakhir'}
                          </span>
                        </div>
                        <p className={`${sub} text-xs`}>Lantai {r.rooms?.floor} · {r.rooms?.type}</p>
                        <p className={`${sub} text-xs mt-1`}>{fmtD(r.start_date)} – {fmtD(r.expiry_date)}</p>
                        {isAct && <p className={`text-xs mt-1 font-medium ${dl<=7?'text-amber-400':'text-emerald-400'}`}>{dl} hari lagi</p>}
                        {isAct && <button onClick={()=>{setTab('qr')}} className="mt-2 w-full py-2 rounded-xl bg-white/5 border border-white/8 text-white/50 text-xs hover:text-white flex items-center justify-center gap-1.5"><QrCode size={12}/> Lihat QR</button>}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ══ QR ══ */}
        {tab==='qr' && (
          <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}}>
            {activeRentals.length === 0 ? (
              <div className={`max-w-sm mx-auto p-7 rounded-3xl border ${crd} text-center`}>
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${crd}`}><QrCode size={28} className={sub}/></div>
                <p className={`${txt} font-semibold mb-1.5`}>QR Tidak Aktif</p>
                <p className={`${sub} text-sm`}>Belum ada sewa aktif</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${activeRentals.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'}`}>
                {activeRentals.map(r => (
                  <div key={r.id} className={`p-6 rounded-3xl border ${crd} text-center`}>
                    <div className="flex items-center justify-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-emerald-400 text-sm font-semibold">Token Aktif</span></div>
                    <button onClick={()=>setQrFullscreen(r)} className="relative inline-block mb-4 cursor-pointer hover:scale-105 transition-transform" title="Klik untuk fullscreen">
                      <div className="absolute -inset-2 rounded-2xl bg-amber-400/10 blur-xl"/>
                      <div className="relative p-4 rounded-2xl bg-white shadow-xl"><QRCodeSVG value={r.access_token} size={160} bgColor="#fff" fgColor="#0f0f1a" level="H"/></div>
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-black/40 rounded-md flex items-center justify-center"><Maximize2 size={11} className="text-white"/></div>
                    </button>
                    <p style={{fontFamily:SERIF}} className={`${txt} font-semibold text-base mb-0.5`}>Kamar {r.rooms?.room_number}</p>
                    <p className={`${sub} text-xs mb-4`}>Berlaku hingga {fmtD(r.expiry_date)}</p>
                    <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><Shield size={12} className="text-emerald-400"/><p className="text-emerald-400 text-xs">Rahasiakan QR ini.</p></div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* QR Fullscreen Modal */}
        <AnimatePresence>
          {qrFullscreen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
              onClick={()=>setQrFullscreen(null)}>
              <motion.div initial={{scale:.8}} animate={{scale:1}} exit={{scale:.8}} className="text-center" onClick={e=>e.stopPropagation()}>
                <div className="p-6 rounded-3xl bg-white shadow-2xl mb-4 inline-block">
                  <QRCodeSVG value={qrFullscreen.access_token} size={280} bgColor="#fff" fgColor="#0f0f1a" level="H"/>
                </div>
                <p style={{fontFamily:SERIF}} className="text-white font-bold text-xl mb-1">Kamar {qrFullscreen.rooms?.room_number}</p>
                <p className="text-white/40 text-sm mb-4">Berlaku hingga {fmtD(qrFullscreen.expiry_date)}</p>
                <button onClick={()=>setQrFullscreen(null)} className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20">Tutup</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ BOOKING ══ */}
        {tab==='booking' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${txt} font-semibold`}>Riwayat Pemesanan</h3>
              {!pendingBooking && <button onClick={()=>setShowBook(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold"><PlusCircle size={13}/> Pesan Kamar</button>}
            </div>
            {bookings.length===0 ? (
              <div className="text-center py-14"><ClipboardList size={36} className={`${sub} mx-auto mb-3`}/><p className={`${sub} text-sm mb-4`}>Belum ada permintaan sewa</p><button onClick={()=>setShowBook(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm"><PlusCircle size={15}/> Pesan Kamar Pertama Anda</button></div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((b,i) => {
                  const sc={pending:'text-amber-400 bg-amber-500/10 border-amber-500/20',approved:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',rejected:'text-red-400 bg-red-500/10 border-red-500/20'}
                  const sl={pending:'Menunggu',approved:'Disetujui',rejected:'Ditolak'}
                  const relRental = rentals.find(r=>r.room_id===b.room_id)
                  return (
                    <motion.div key={b.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.07}} className={`p-5 rounded-2xl border ${b.status==='approved'?'bg-emerald-500/5 border-emerald-500/20':b.status==='rejected'?'bg-red-500/5 border-red-500/15':dark?'bg-white/3 border-white/8':'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div><div className="flex items-center gap-2 mb-0.5"><p className={`${txt} font-semibold text-sm`}>Kamar {b.rooms?.room_number}</p><span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${sc[b.status]}`}>{sl[b.status]}</span></div><p className={`${sub} text-xs capitalize`}>{b.rooms?.type} · Lantai {b.rooms?.floor}</p></div>
                        <div className="text-right"><p className="text-amber-400 font-semibold text-sm">{fmtIDR(b.rooms?.price_monthly)}</p><p className={`${sub} text-xs`}>/bulan</p></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className={`p-2.5 rounded-xl border ${dark?'bg-white/3 border-white/5':'bg-gray-50 border-gray-100'}`}><p className={`${sub} text-xs`}>Check-in</p><p className={`${txt} text-sm font-medium`}>{fmtD(b.check_in_date)}</p></div>
                        <div className={`p-2.5 rounded-xl border ${dark?'bg-white/3 border-white/5':'bg-gray-50 border-gray-100'}`}><p className={`${sub} text-xs`}>Durasi</p><p className={`${txt} text-sm font-medium`}>{b.duration_months} bulan</p></div>
                      </div>
                      {/* QR for this booking if rental active */}
                      {relRental?.status==='active' && relRental?.access_token && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                          <div className="p-1 bg-white rounded-lg"><QRCodeSVG value={relRental.access_token} size={40} bgColor="#fff" fgColor="#0f0f1a"/></div>
                          <div><p className="text-emerald-300 text-xs font-semibold">QR Aktif</p><p className="text-emerald-400/50 text-xs">Berakhir {fmtD(relRental.expiry_date)}</p></div>
                          <button onClick={()=>setTab('qr')} className="ml-auto text-emerald-400 text-xs underline">Perbesar</button>
                        </div>
                      )}
                      {b.admin_notes && <div className={`p-3 rounded-xl text-xs mb-3 ${b.status==='approved'?'bg-emerald-500/10 text-emerald-300':b.status==='rejected'?'bg-red-500/10 text-red-300':'bg-white/5 text-white/40'}`}><p className="font-semibold mb-0.5">Catatan Admin:</p><p>{b.admin_notes}</p></div>}
                      {b.status==='approved' && !relRental && <button onClick={()=>setShowPay({rental:pendingPayRental,months:b.duration_months||1})} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5"><CreditCard size={13}/> Bayar untuk Aktivasi Kamar</button>}
                      <p className={`${sub} text-xs mt-2 opacity-50`}>Diajukan {fmtD(b.created_at)}</p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ HISTORY ══ */}
        {tab==='history' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            {payments.length>0 ? (
              <div className="flex flex-col gap-3">
                {payments.map((p,i)=>(
                  <motion.div key={p.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.06}} className={`flex items-center gap-4 p-5 rounded-2xl border ${crd}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.status==='paid'?'bg-emerald-500/10':p.status==='pending'?'bg-amber-500/10':'bg-red-500/10'}`}>
                      {p.status==='paid'?<CheckCircle size={18} className="text-emerald-400"/>:p.status==='pending'?<Clock size={18} className="text-amber-400"/>:<AlertCircle size={18} className="text-red-400"/>}
                    </div>
                    <div className="flex-1 min-w-0"><p className={`${txt} font-semibold text-sm`}>{p.months_paid} bulan sewa</p><p className={`${sub} text-xs`}>{fmtD(p.created_at)}</p></div>
                    <div className="text-right shrink-0"><p className={`${txt} font-bold`}>{fmtIDR(p.amount)}</p><span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-semibold ${p.status==='paid'?'bg-emerald-500/10 text-emerald-400':p.status==='pending'?'bg-amber-500/10 text-amber-400':'bg-red-500/10 text-red-400'}`}>{p.status==='paid'?'Lunas':p.status==='pending'?'Pending':'Gagal'}</span></div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-14"><Receipt size={36} className={`${sub} mx-auto mb-3`}/><p className={`${sub} text-sm`}>Belum ada riwayat pembayaran</p></div>
            )}
          </motion.div>
        )}

        {/* ══ PROFILE ══ */}
        {tab==='profile' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="max-w-lg space-y-4">
            {/* Info pribadi */}
            <div className={`p-6 rounded-3xl border ${crd}`}>
              <div className="flex items-center gap-2 mb-5"><Edit3 size={16} className="text-amber-400"/><h3 className={`${txt} font-semibold`}>Informasi Saya</h3></div>
              <div className="space-y-3">
                <div><label className={`${sub} text-xs mb-1 block`}>Nama Lengkap</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.full_name} onChange={e=>setProfileForm(f=>({...f,full_name:e.target.value}))}/></div>
                <div><label className={`${sub} text-xs mb-1 block`}>No. Telepon</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))}/></div>
                <div><label className={`${sub} text-xs mb-1 block`}>No. KTP</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.ktp_number} onChange={e=>setProfileForm(f=>({...f,ktp_number:e.target.value}))} placeholder="16 digit NIK"/></div>
                <div><label className={`${sub} text-xs mb-1 block`}>Pekerjaan</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.occupation} onChange={e=>setProfileForm(f=>({...f,occupation:e.target.value}))} placeholder="cth: Karyawan, Mahasiswa"/></div>
              </div>
              {profileMsg && <p className="text-sm mt-3">{profileMsg}</p>}
              <button onClick={saveProfile} disabled={savingProfile} className="mt-4 w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14}/>{savingProfile?'Menyimpan...':'Simpan Perubahan'}
              </button>
            </div>

            {/* Ganti Email */}
            <div className={`p-6 rounded-3xl border ${crd}`}>
              <div className="flex items-center gap-2 mb-2"><User size={16} className="text-amber-400"/><h3 className={`${txt} font-semibold`}>Ganti Email</h3></div>
              <p className={`${sub} text-xs mb-4`}>Email verifikasi akan dikirim. Setelah konfirmasi, akun akan otomatis logout.</p>
              <div><label className={`${sub} text-xs mb-1 block`}>Email Baru</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} type="email" value={profileForm.new_email} onChange={e=>setProfileForm(f=>({...f,new_email:e.target.value}))} placeholder="email@baru.com"/></div>
              <button onClick={changeEmail} disabled={savingProfile||!profileForm.new_email} className="mt-3 w-full py-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-amber-400/20">
                <User size={14}/> Kirim Verifikasi Email
              </button>
            </div>

            {/* Ganti Password */}
            <div className={`p-6 rounded-3xl border ${crd}`}>
              <div className="flex items-center gap-2 mb-2"><Lock size={16} className="text-amber-400"/><h3 className={`${txt} font-semibold`}>Ganti Password</h3></div>
              <p className={`${sub} text-xs mb-4`}>Setelah berhasil, akun akan otomatis logout.</p>
              <div className="space-y-3">
                <div className="relative"><label className={`${sub} text-xs mb-1 block`}>Password Baru</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} type={showPwd?'text':'password'} value={pwdForm.new} onChange={e=>setPwdForm(p=>({...p,new:e.target.value}))} placeholder="Min. 6 karakter"/><button onClick={()=>setShowPwd(v=>!v)} className={`absolute right-3 top-8 ${sub}`}>{showPwd?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>
                <div><label className={`${sub} text-xs mb-1 block`}>Konfirmasi Password</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} type={showPwd?'text':'password'} value={pwdForm.confirm} onChange={e=>setPwdForm(p=>({...p,confirm:e.target.value}))} placeholder="Ulangi password baru"/></div>
              </div>
              {pwdMsg && <p className="text-sm mt-3">{pwdMsg}</p>}
              <button onClick={savePassword} disabled={savingPwd} className={`mt-4 w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${dark?'bg-white/10 hover:bg-white/15 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
                <Lock size={14}/>{savingPwd?'Mengubah...':'Ubah Password'}
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {showPay && <PayModal rental={showPay?.rental||showPay} initialMonths={showPay?.months||1} onClose={()=>setShowPay(null)} onSuccess={()=>{setShowPay(null);loadData()}}/>}
        {showBook && <BookingModal rooms={rooms} profile={profile} onClose={()=>setShowBook(false)} onSuccess={()=>{setShowBook(false);loadData();setTab('booking')}}/>}
      </AnimatePresence>
    </div>
  )
}

function PayModal({rental, onClose, onSuccess, initialMonths=1}) {
  const [months, setM] = useState(initialMonths)
  const [loading, setL] = useState(false)
  const [error, setE]   = useState('')
  const price = rental?.monthly_price ?? rental?.rooms?.price_monthly ?? 0
  const total = price * months

  const pay = async () => {
    setL(true); setE('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':import.meta.env.VITE_SUPABASE_ANON_KEY},
        body: JSON.stringify({rental_id:rental.id, months_paid:months})
      })
      const d = await res.json()
      if (!d.success || !d.snap_token) throw new Error(d.error?? 'Gagal')
      if (!window.snap) throw new Error('Midtrans belum dimuat')
      window.snap.pay(d.snap_token, { onSuccess:()=>onSuccess(), onPending:()=>{setE('Selesaikan pembayaran.');setL(false)}, onError:()=>{setE('Gagal, coba lagi.');setL(false)}, onClose:()=>setL(false) })
    } catch(e) { setE(e.message); setL(false) }
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}/>
      <motion.div initial={{opacity:0,y:50,scale:.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30}} transition={{type:'spring',stiffness:300,damping:30}} className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500"/>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5"><div><h3 style={{fontFamily:'Georgia,serif'}} className="text-xl font-bold text-white">Pembayaran Sewa</h3><p className="text-white/30 text-sm">Kamar {rental?.rooms?.room_number}</p></div><button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button></div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/8 mb-5">
            <button onClick={()=>setM(m=>Math.max(1,m-1))} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Minus size={15}/></button>
            <div className="flex-1 text-center"><span style={{fontFamily:'Georgia,serif'}} className="text-3xl font-bold text-white">{months}</span><span className="text-white/30 text-sm ml-2">bulan</span></div>
            <button onClick={()=>setM(m=>Math.min(12,m+1))} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Plus size={15}/></button>
          </div>
          <div className="p-4 rounded-2xl bg-white/3 border border-white/6 mb-4">
            <div className="flex justify-between text-sm text-white/40 mb-1.5"><span>{fmtIDR(price)} x {months} bulan</span><span className="text-white">{fmtIDR(total)}</span></div>
            <div className="flex justify-between font-bold pt-2.5 mt-2 border-t border-white/6"><span className="text-white">Total</span><span className="text-amber-400 text-lg">{fmtIDR(total)}</span></div>
          </div>
          {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15 mb-4"><AlertCircle size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-xs">{error}</p></div>}
          <button onClick={pay} disabled={loading} className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">{loading?<><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"/>Memuat...</>:<><CreditCard size={16}/> Bayar {fmtIDR(total)}</>}</button>
          <p className="text-center text-white/15 text-xs mt-2.5">🔒 Aman via Midtrans</p>
        </div>
      </motion.div>
    </motion.div>
  )
}