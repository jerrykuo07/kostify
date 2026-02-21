// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, LogOut, RefreshCw, Home, Users, TrendingUp, AlertTriangle,
  DoorOpen, DoorClosed, Plus, Pencil, Trash2, X, Check, CheckCircle,
  XCircle, Clock, ChevronDown, Save, Eye, ClipboardList, Wrench
} from 'lucide-react'

const SERIF   = 'Georgia,serif'
const fmtIDR  = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n??0)
const fmtDate = s => s ? new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'

const ROOM_TYPES       = ['standard','deluxe','suite']
const FACILITY_OPTIONS = ['AC','WiFi','Kamar Mandi Dalam','Balkon','TV','Mini Kitchen','Lemari','Meja Belajar','Water Heater']

const emptyRoom = { room_number:'', floor:'1', type:'standard', price_monthly:'', facilities:[], description:'' }

export default function AdminDashboard({ profile, onBack, onSignOut }) {
  const [tab, setTab]               = useState('overview')
  const [rooms, setRooms]           = useState([])
  const [rentals, setRentals]       = useState([])
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [stats, setStats]           = useState(null)

  // Room modal state
  const [roomModal, setRoomModal]   = useState(null) // null | 'add' | 'edit'
  const [editRoom, setEditRoom]     = useState(emptyRoom)
  const [roomSaving, setRoomSaving] = useState(false)
  const [roomError, setRoomError]   = useState('')

  // Booking review modal
  const [reviewModal, setReviewModal] = useState(null) // booking object | null
  const [reviewAction, setReviewAction] = useState('') // 'approved' | 'rejected'
  const [reviewNotes, setReviewNotes]   = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('rentals').select('*, profiles(full_name,phone), rooms(room_number)').order('created_at',{ascending:false}).limit(30),
      supabase.from('booking_requests').select('*, rooms(room_number,type,floor,price_monthly)').order('created_at',{ascending:false}),
    ])
    const roomData    = r1.data ?? []
    const rentalData  = r2.data ?? []
    const bookingRaw  = r3.data ?? []
    if (r3.error) console.error('booking_requests error:', r3.error)

    // Ambil profil tenant secara terpisah
    let bookingData = bookingRaw
    if (bookingRaw.length > 0) {
      const tenantIds = [...new Set(bookingRaw.map(b => b.tenant_id))]
      const { data: profilesData, error: pe } = await supabase
        .from('profiles').select('id,full_name,phone').in('id', tenantIds)
      if (pe) console.error('profiles error:', pe)
      const profileMap = {}
      ;(profilesData ?? []).forEach(p => { profileMap[p.id] = p })
      bookingData = bookingRaw.map(b => ({ ...b, profiles: profileMap[b.tenant_id] ?? null }))
    }
    setRooms(roomData); setRentals(rentalData); setBookings(bookingData)

    // Calc stats
    const totalRev = 0 // fetch from payments if needed
    const occupied = roomData.filter(r=>r.status==='occupied').length
    const available= roomData.filter(r=>r.status==='available').length
    const soon     = new Date(); soon.setDate(soon.getDate()+7)
    const expiring = rentalData.filter(r=>r.status==='active'&&new Date(r.expiry_date)<=soon&&new Date(r.expiry_date)>=new Date()).length
    const pending  = bookingData.filter(b=>b.status==='pending').length
    setStats({ total:roomData.length, occupied, available, expiring, pending, activeRentals: rentalData.filter(r=>r.status==='active').length })
    setLoading(false)
  }

  // ── Room CRUD ────────────────────────────────────────────────────────────
  const openAdd  = () => { setEditRoom(emptyRoom); setRoomError(''); setRoomModal('add') }
  const openEdit = (room) => { setEditRoom({...room}); setRoomError(''); setRoomModal('edit') }

  const saveRoom = async () => {
    if (!editRoom.room_number.trim()) { setRoomError('Nomor kamar wajib diisi'); return }
    if (!editRoom.price_monthly || Number(editRoom.price_monthly) <= 0) { setRoomError('Harga wajib diisi'); return }
    setRoomSaving(true); setRoomError('')
    try {
      const payload = {
        room_number:   editRoom.room_number.trim(),
        floor:         editRoom.floor,
        type:          editRoom.type,
        price_monthly: Number(editRoom.price_monthly),
        facilities:    editRoom.facilities,
        description:   editRoom.description.trim(),
        updated_at:    new Date().toISOString(),
      }
      if (roomModal === 'add') {
        payload.status = 'available'
        const { error } = await supabase.from('rooms').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('rooms').update(payload).eq('id', editRoom.id)
        if (error) throw error
      }
      setRoomModal(null)
      await loadAll()
    } catch (err) {
      setRoomError(err.message.includes('unique') ? 'Nomor kamar sudah ada' : err.message)
    } finally { setRoomSaving(false) }
  }

  const deleteRoom = async (room) => {
    if (!confirm(`Hapus Kamar ${room.room_number}? Tindakan ini tidak bisa dibatalkan.`)) return
    await supabase.from('rooms').delete().eq('id', room.id)
    await loadAll()
  }

  const toggleRoomStatus = async (room) => {
    const next = room.status === 'maintenance' ? 'available' : 'maintenance'
    await supabase.from('rooms').update({ status: next }).eq('id', room.id)
    await loadAll()
  }

  const toggleFacility = (f) => {
    setEditRoom(r => ({
      ...r,
      facilities: r.facilities.includes(f) ? r.facilities.filter(x=>x!==f) : [...r.facilities, f]
    }))
  }

  // ── Booking Review ───────────────────────────────────────────────────────
  const openReview = (booking, action) => {
    setReviewModal(booking); setReviewAction(action); setReviewNotes('')
  }

  const submitReview = async () => {
    setReviewSaving(true)
    try {
      const { error } = await supabase.from('booking_requests')
        .update({ status: reviewAction, admin_notes: reviewNotes.trim(), reviewed_by: profile.id })
        .eq('id', reviewModal.id)
      if (error) throw error
      setReviewModal(null)
      await loadAll()
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally { setReviewSaving(false) }
  }

  const TABS = [
    { id:'overview',  label:'Overview',    icon:Home },
    { id:'bookings',  label:'Pemesanan',   icon:ClipboardList, badge: stats?.pending },
    { id:'rooms',     label:'Kamar',       icon:DoorOpen },
    { id:'tenants',   label:'Penyewa',     icon:Users },
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft size={15}/> Beranda
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <span style={{fontFamily:SERIF}} className="text-black font-bold text-sm">K</span>
            </div>
            <span className="text-white font-semibold text-sm">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadAll} disabled={loading} className="p-2 rounded-lg text-slate-500 hover:text-white transition-colors">
              <RefreshCw size={15} className={loading?'animate-spin':''}/>
            </button>
            <button onClick={onSignOut} className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-sm transition-colors">
              <LogOut size={14}/> <span className="hidden sm:block">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-5 py-7 pb-16">
        {/* Header */}
        <div className="mb-7">
          <p className="text-slate-500 text-sm">Selamat datang kembali</p>
          <h1 style={{fontFamily:SERIF}} className="text-2xl font-bold text-white mt-0.5">
            {profile?.full_name} <span className="text-amber-400 italic">— Administrator</span>
          </h1>
        </div>

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-7">
            {[
              {label:'Total Kamar',    value:stats.total,        color:'indigo', icon:Home},
              {label:'Terisi',         value:stats.occupied,     color:'emerald',icon:DoorClosed},
              {label:'Kosong',         value:stats.available,    color:'amber',  icon:DoorOpen},
              {label:'Penyewa Aktif',  value:stats.activeRentals,color:'violet', icon:Users},
              {label:'Booking Baru',   value:stats.pending,      color:'orange', icon:ClipboardList, highlight: stats.pending > 0},
            ].map(({label,value,color,icon:Icon,highlight})=>(
              <motion.div key={label} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
                className={`p-4 rounded-2xl border transition-all ${
                  highlight ? 'bg-orange-500/10 border-orange-500/25 ring-1 ring-orange-500/20' :
                  color==='indigo'  ? 'bg-indigo-500/5  border-indigo-500/15' :
                  color==='emerald' ? 'bg-emerald-500/5 border-emerald-500/15' :
                  color==='amber'   ? 'bg-amber-500/5   border-amber-500/15' :
                  color==='violet'  ? 'bg-violet-500/5  border-violet-500/15' :
                                      'bg-slate-800/50  border-slate-700'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs">{label}</p>
                  <Icon size={13} className={
                    highlight ? 'text-orange-400' :
                    color==='indigo' ? 'text-indigo-400' : color==='emerald' ? 'text-emerald-400' :
                    color==='amber'  ? 'text-amber-400'  : color==='violet'  ? 'text-violet-400' : 'text-slate-500'
                  }/>
                </div>
                <p className={`text-3xl font-bold ${highlight?'text-orange-400':'text-white'}`}>{value}</p>
                {highlight && <p className="text-orange-400/60 text-xs mt-0.5">Perlu ditinjau</p>}
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit mb-6">
          {TABS.map(({id,label,icon:Icon,badge})=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                tab===id ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
              }`}>
              <Icon size={14}/>{label}
              {badge>0&&<span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${tab===id?'bg-black/25 text-black':'bg-orange-500 text-white'}`}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        {tab==='overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Occupancy bar */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Tingkat Hunian</h3>
                <span className="text-amber-400 font-bold">{Math.round((stats.occupied/(stats.total||1))*100)}%</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div initial={{width:0}} animate={{width:`${(stats.occupied/(stats.total||1))*100}%`}}
                  transition={{duration:1,delay:.2,ease:[.22,1,.36,1]}}
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"/>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Terisi ({stats.occupied})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block"/>Kosong ({stats.available})</span>
              </div>
            </div>

            {/* Pending bookings summary */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Booking Menunggu</h3>
                {stats.pending > 0 && <button onClick={()=>setTab('bookings')} className="text-amber-400 text-xs hover:underline">Lihat semua →</button>}
              </div>
              {bookings.filter(b=>b.status==='pending').slice(0,4).length > 0 ? (
                <div className="flex flex-col gap-2">
                  {bookings.filter(b=>b.status==='pending').slice(0,4).map(b=>(
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-white text-sm font-medium">{b.profiles?.full_name}</p>
                        <p className="text-slate-500 text-xs">Kamar {b.rooms?.room_number} · {fmtDate(b.check_in_date)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>openReview(b,'approved')} className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"><Check size={13}/></button>
                        <button onClick={()=>openReview(b,'rejected')} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"><X size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm">Tidak ada booking baru 👍</p>
              )}
            </div>

            {/* Expiring soon */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 md:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Sewa Segera Berakhir (≤7 hari)</h3>
              {rentals.filter(r=>{const e=new Date(r.expiry_date);const s=new Date();s.setDate(s.getDate()+7);return r.status==='active'&&e<=s&&e>=new Date()}).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rentals.filter(r=>{const e=new Date(r.expiry_date);const s=new Date();s.setDate(s.getDate()+7);return r.status==='active'&&e<=s&&e>=new Date()}).map(r=>(
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <div><p className="text-white text-sm font-medium">{r.profiles?.full_name}</p><p className="text-slate-500 text-xs">Kamar {r.rooms?.room_number}</p></div>
                      <span className="text-amber-400 text-xs font-semibold">{fmtDate(r.expiry_date)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-600 text-sm">Tidak ada yang akan berakhir segera 👍</p>}
            </div>
          </div>
        )}

        {/* ═══ TAB: BOOKINGS ═══ */}
        {tab==='bookings' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Semua Permintaan Sewa</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">{bookings.filter(b=>b.status==='pending').length} Pending</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{bookings.filter(b=>b.status==='approved').length} Disetujui</span>
              </div>
            </div>

            {bookings.length===0 ? (
              <div className="text-center py-14"><ClipboardList size={36} className="text-slate-700 mx-auto mb-3"/><p className="text-slate-500">Belum ada permintaan sewa</p></div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((b,i)=>(
                  <motion.div key={b.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}
                    className={`p-5 rounded-2xl border ${b.status==='pending'?'bg-slate-900/80 border-slate-700':b.status==='approved'?'bg-emerald-500/5 border-emerald-500/20':'bg-slate-900/40 border-slate-800'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-white font-semibold">{b.profiles?.full_name}</p>
                          <BookPill status={b.status}/>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                          <MiniInfo label="Kamar" value={`${b.rooms?.room_number} (${b.rooms?.type})`}/>
                          <MiniInfo label="Check-in" value={fmtDate(b.check_in_date)}/>
                          <MiniInfo label="Durasi" value={`${b.duration_months} bulan`}/>
                          <MiniInfo label="No. HP" value={b.profiles?.phone??'—'}/>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <MiniInfo label="No. KTP" value={b.id_number}/>
                          <MiniInfo label="Pekerjaan" value={b.occupation||'—'}/>
                        </div>
                        {b.message && (
                          <div className="p-2.5 rounded-xl bg-white/3 border border-white/5 mt-2">
                            <p className="text-slate-500 text-xs mb-0.5">Pesan:</p>
                            <p className="text-slate-300 text-sm italic">"{b.message}"</p>
                          </div>
                        )}
                        {b.admin_notes && (
                          <div className={`p-2.5 rounded-xl mt-2 text-xs ${b.status==='approved'?'bg-emerald-500/10 text-emerald-300':'bg-red-500/10 text-red-300'}`}>
                            <span className="font-semibold">Catatan admin: </span>{b.admin_notes}
                          </div>
                        )}
                        <p className="text-slate-600 text-xs mt-2">Diajukan {fmtDate(b.created_at)}</p>
                      </div>

                      {/* Right: actions */}
                      {b.status==='pending' && (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <button onClick={()=>openReview(b,'approved')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-all">
                            <CheckCircle size={15}/> Setujui
                          </button>
                          <button onClick={()=>openReview(b,'rejected')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all">
                            <XCircle size={15}/> Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB: ROOMS ═══ */}
        {tab==='rooms' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Kelola Kamar</h3>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-all">
                <Plus size={15}/> Tambah Kamar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room,i)=>(
                <motion.div key={room.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                  className={`p-5 rounded-2xl border transition-all group ${
                    room.status==='occupied'    ? 'bg-indigo-500/5 border-indigo-500/20' :
                    room.status==='maintenance' ? 'bg-amber-500/5  border-amber-500/20' :
                                                  'bg-slate-900/60 border-slate-800'
                  }`}>
                  {/* Room header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-bold text-lg">Kamar {room.room_number}</p>
                        <RoomStatusBadge status={room.status}/>
                      </div>
                      <p className="text-slate-500 text-xs capitalize">Lantai {room.floor} · {room.type}</p>
                    </div>
                    {/* Action buttons — show on hover */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(room)}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>toggleRoomStatus(room)}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title={room.status==='maintenance'?'Set Available':'Set Maintenance'}>
                        <Wrench size={12}/>
                      </button>
                      {room.status==='available' && (
                        <button onClick={()=>deleteRoom(room)}
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-amber-400 font-bold text-base mb-3">{fmtIDR(room.price_monthly)}<span className="text-slate-500 text-xs font-normal">/bulan</span></p>

                  <div className="flex flex-wrap gap-1.5">
                    {room.facilities?.map((f,j)=>(
                      <span key={j} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">{f}</span>
                    ))}
                  </div>

                  {room.description && <p className="text-slate-600 text-xs mt-3 leading-relaxed">{room.description}</p>}
                </motion.div>
              ))}

              {rooms.length===0&&!loading&&(
                <div className="col-span-3 text-center py-14">
                  <DoorOpen size={36} className="text-slate-700 mx-auto mb-3"/>
                  <p className="text-slate-500 text-sm mb-4">Belum ada kamar. Tambah kamar pertama Anda.</p>
                  <button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all"><Plus size={15}/> Tambah Kamar</button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ TAB: TENANTS ═══ */}
        {tab==='tenants' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <h3 className="text-white font-semibold mb-4">Data Penyewa</h3>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-800">
                    {['Penyewa','Kamar','Mulai','Berakhir','Status'].map(h=>(
                      <th key={h} className="text-left px-5 py-4 text-slate-500 text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {rentals.map((r,i)=>{
                      const exp=new Date(r.expiry_date); const s=new Date(); s.setDate(s.getDate()+7)
                      const soon=r.status==='active'&&exp<=s&&exp>=new Date()
                      return(
                        <motion.tr key={r.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.04}} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4"><p className="text-white text-sm font-medium">{r.profiles?.full_name??'—'}</p><p className="text-slate-500 text-xs">{r.profiles?.phone??''}</p></td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{r.rooms?.room_number??'—'}</td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{fmtDate(r.start_date)}</td>
                          <td className="px-5 py-4"><p className={`text-sm ${soon?'text-amber-400':'text-slate-300'}`}>{fmtDate(r.expiry_date)}</p>{soon&&<p className="text-amber-500 text-xs">Segera berakhir</p>}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${r.status==='active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':r.status==='expired'?'bg-red-500/10 text-red-400 border-red-500/20':'bg-slate-500/10 text-slate-400 border-slate-700'}`}>
                              {r.status==='active'?'Aktif':r.status==='expired'?'Berakhir':'Berhenti'}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                    {rentals.length===0&&<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-sm">Belum ada data penyewa</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ═══ MODAL: Add/Edit Room ═══ */}
      <AnimatePresence>
        {roomModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setRoomModal(null)}/>
            <motion.div
              initial={{opacity:0,y:50,scale:.96}} animate={{opacity:1,y:0,scale:1}}
              exit={{opacity:0,y:30}} transition={{type:'spring',stiffness:300,damping:30}}
              className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 shrink-0"/>
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/6 shrink-0">
                <h3 style={{fontFamily:SERIF}} className="text-lg font-bold text-white">{roomModal==='add'?'Tambah Kamar Baru':'Edit Kamar'}</h3>
                <button onClick={()=>setRoomModal(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors"><X size={15}/></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <div className="flex flex-col gap-4">
                  {/* Nomor & Lantai */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-1.5">Nomor Kamar *</label>
                      <input value={editRoom.room_number} onChange={e=>setEditRoom(r=>({...r,room_number:e.target.value}))}
                        placeholder="101" className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-1.5">Lantai</label>
                      <select value={editRoom.floor} onChange={e=>setEditRoom(r=>({...r,floor:e.target.value}))}
                        className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all appearance-none">
                        {['1','2','3','4','5'].map(f=><option key={f} value={f} className="bg-[#111]">Lantai {f}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tipe */}
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2">Tipe Kamar</label>
                    <div className="flex gap-2">
                      {ROOM_TYPES.map(t=>(
                        <button key={t} onClick={()=>setEditRoom(r=>({...r,type:t}))}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${editRoom.type===t?'bg-amber-400/10 border-amber-400/40 text-amber-300':'bg-white/3 border-white/8 text-white/40 hover:text-white'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Harga */}
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">Harga per Bulan (Rp) *</label>
                    <input type="number" value={editRoom.price_monthly} onChange={e=>setEditRoom(r=>({...r,price_monthly:e.target.value}))}
                      placeholder="800000" className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all"/>
                    {editRoom.price_monthly && <p className="text-amber-400/60 text-xs mt-1">{fmtIDR(editRoom.price_monthly)}</p>}
                  </div>

                  {/* Fasilitas */}
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2">Fasilitas</label>
                    <div className="flex flex-wrap gap-2">
                      {FACILITY_OPTIONS.map(f=>(
                        <button key={f} onClick={()=>toggleFacility(f)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${editRoom.facilities.includes(f)?'bg-amber-400/10 border-amber-400/30 text-amber-300':'bg-white/3 border-white/8 text-white/40 hover:text-white hover:border-white/20'}`}>
                          {editRoom.facilities.includes(f)&&<span className="mr-1">✓</span>}{f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">Deskripsi (opsional)</label>
                    <textarea value={editRoom.description} onChange={e=>setEditRoom(r=>({...r,description:e.target.value}))}
                      rows={2} placeholder="Deskripsi singkat kamar..."
                      className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all resize-none"/>
                  </div>

                  {roomError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15">
                      <X size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-sm">{roomError}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/6 shrink-0">
                <div className="flex gap-2">
                  <button onClick={()=>setRoomModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm font-medium transition-all">Batal</button>
                  <button onClick={saveRoom} disabled={roomSaving}
                    className="flex-[2] py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {roomSaving?<><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"/>Menyimpan...</>:<><Save size={15}/>{roomModal==='add'?'Tambah Kamar':'Simpan Perubahan'}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Review Booking ═══ */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setReviewModal(null)}/>
            <motion.div
              initial={{opacity:0,scale:.92,y:20}} animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:.94}} transition={{type:'spring',stiffness:300,damping:30}}
              className="relative w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className={`h-1 ${reviewAction==='approved'?'bg-emerald-500':'bg-red-500'}`}/>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 style={{fontFamily:SERIF}} className="text-lg font-bold text-white">
                    {reviewAction==='approved'?'✅ Setujui Booking':'❌ Tolak Booking'}
                  </h3>
                  <button onClick={()=>setReviewModal(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button>
                </div>

                {/* Booking summary */}
                <div className="p-4 rounded-2xl bg-white/3 border border-white/6 mb-5">
                  <p className="text-white font-semibold">{reviewModal.profiles?.full_name}</p>
                  <p className="text-white/40 text-sm">Kamar {reviewModal.rooms?.room_number} · {reviewModal.duration_months} bulan</p>
                  <p className="text-white/40 text-sm">Check-in: {fmtDate(reviewModal.check_in_date)}</p>
                  <p className="text-white/40 text-sm">No. KTP: {reviewModal.id_number}</p>
                  {reviewModal.message && <p className="text-white/30 text-xs mt-2 italic">"{reviewModal.message}"</p>}
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium text-white/40 mb-1.5">
                    Catatan untuk penyewa {reviewAction==='rejected'&&<span className="text-red-400">(wajib jika menolak)</span>}
                  </label>
                  <textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} rows={3}
                    placeholder={reviewAction==='approved'?'Silakan lakukan pembayaran untuk aktivasi kamar...':'Alasan penolakan (contoh: kamar sudah tidak tersedia)...'}
                    className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all resize-none"/>
                </div>

                <div className="flex gap-2">
                  <button onClick={()=>setReviewModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm font-medium transition-all">Batal</button>
                  <button onClick={submitReview} disabled={reviewSaving||(reviewAction==='rejected'&&!reviewNotes.trim())}
                    className={`flex-[2] py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-2 ${reviewAction==='approved'?'bg-emerald-600 hover:bg-emerald-500':'bg-red-600 hover:bg-red-500'}`}>
                    {reviewSaving?<><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/>Memproses...</>
                      :<>{reviewAction==='approved'?<><CheckCircle size={15}/>Setujui & Aktifkan</>:<><XCircle size={15}/>Tolak Permintaan</>}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Mini components ───────────────────────────────────────────────────────
const MiniInfo = ({label,value}) => (
  <div><p className="text-slate-500 text-xs">{label}</p><p className="text-slate-200 text-sm font-medium">{value}</p></div>
)
const BookPill = ({status}) => {
  const m = {pending:{c:'text-amber-400 bg-amber-500/10 border-amber-500/20',l:'Menunggu'},approved:{c:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',l:'Disetujui'},rejected:{c:'text-red-400 bg-red-500/10 border-red-500/20',l:'Ditolak'}}
  const s = m[status]??m.pending
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${s.c}`}>{s.l}</span>
}
const RoomStatusBadge = ({status}) => {
  const m = {available:{c:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',l:'Kosong'},occupied:{c:'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',l:'Terisi'},maintenance:{c:'text-amber-400 bg-amber-500/10 border-amber-500/20',l:'Perawatan'}}
  const s = m[status]??m.available
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${s.c}`}>{s.l}</span>
}