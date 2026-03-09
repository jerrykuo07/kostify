// src/pages/AdminDashboard.jsx — v3: all 9 features
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext.jsx'
import {
  ArrowLeft, LogOut, RefreshCw, Home, Users, TrendingUp, AlertTriangle,
  DoorOpen, Plus, Pencil, Trash2, X, Check, CheckCircle,
  XCircle, Clock, Save, Eye, EyeOff, ClipboardList, Wrench,
  Sun, Moon, Filter, Lock, Edit3, ChevronRight, Bell
} from 'lucide-react'

const SERIF   = 'Georgia,serif'
const fmtIDR  = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n??0)
const fmtDate = s => s ? new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—'
const daysLeft = d => d ? Math.ceil((new Date(d)-new Date())/86400000) : 0

const ROOM_TYPES       = ['standard','deluxe','suite']
const FACILITY_OPTIONS = ['AC','WiFi','Kamar Mandi Dalam','Balkon','TV','Mini Kitchen','Lemari','Meja Belajar','Water Heater']
const emptyRoom = { room_number:'', floor:'', type:'standard', price_monthly:'', facilities:[], description:'' }

export default function AdminDashboard({ profile: initProfile, onBack, onSignOut, onProfileLoad }) {
  const { dark, toggle } = useTheme()
  const [profile, setProfile] = useState(initProfile)
  const [tab, setTab]             = useState('overview')
  const [rooms, setRooms]         = useState([])
  const [rentals, setRentals]     = useState([])
  const [bookings, setBookings]   = useState([])
  const [floors, setFloors]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [stats, setStats]         = useState(null)
  const [floorFilter, setFloorFilter] = useState('all')

  // Room modal
  const [roomModal, setRoomModal]   = useState(null)
  const [editRoom, setEditRoom]     = useState(emptyRoom)
  const [roomSaving, setRoomSaving] = useState(false)
  const [roomError, setRoomError]   = useState('')


  // Floor manager
  const [showFloorMgr, setShowFloorMgr] = useState(false)
  const [newFloor, setNewFloor]         = useState('')

  // Booking review
  const [reviewModal, setReviewModal]   = useState(null)
  const [reviewAction, setReviewAction] = useState('')
  const [reviewNotes, setReviewNotes]   = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  // Profile & password edit
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name||'', phone: profile?.phone||'' })
  const [pwdForm, setPwdForm]         = useState({ new:'', confirm:'' })
  const [showPwd, setShowPwd]         = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd]     = useState(false)
  const [profileMsg, setProfileMsg]   = useState('')
  const [pwdMsg, setPwdMsg]           = useState('')

  // Theme-aware classes
  const bg   = dark ? 'bg-[#080808]'   : 'bg-gray-50'
  const card = dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'
  const hdr  = dark ? 'bg-[#080808]/90 border-slate-800' : 'bg-white/90 border-gray-200'
  const txt  = dark ? 'text-white'     : 'text-gray-900'
  const sub  = dark ? 'text-slate-500' : 'text-gray-500'
  const inp  = dark ? 'bg-white/5 border-white/10 text-white placeholder-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'

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

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('rooms').select('*').order('floor').order('room_number'),
      supabase.from('rentals').select('*, rooms(room_number,floor,type)').order('created_at',{ascending:false}).limit(50),
      supabase.from('booking_requests').select('*, rooms(room_number,type,floor,price_monthly)').order('created_at',{ascending:false}),
    ])
    const roomData  = r1.data ?? []
    const rentalRaw = r2.data ?? []
    const bookingRaw = r3.data ?? []

    // Fetch profiles separately
    const allIds = [...new Set([...bookingRaw.map(b=>b.tenant_id), ...rentalRaw.map(r=>r.tenant_id)])]
    let pm = {}
    if (allIds.length > 0) {
      const { data: pd } = await supabase.from('profiles').select('id,full_name,phone,ktp_number').in('id', allIds)
      ;(pd??[]).forEach(p => pm[p.id] = p)
    }
    const bookingData = bookingRaw.map(b => ({...b, profiles: pm[b.tenant_id]??null}))
    const rentalData  = rentalRaw.map(r => ({...r, profiles: pm[r.tenant_id]??null}))

    // Dynamic floors
    const uniqueFloors = [...new Set(roomData.map(r => String(r.floor)))].sort((a,b)=>Number(a)-Number(b))
    setFloors(uniqueFloors)
    setRooms(roomData); setRentals(rentalData); setBookings(bookingData)

    const occupied  = roomData.filter(r=>r.status==='occupied').length
    const available = roomData.filter(r=>r.status==='available').length
    const pending   = bookingData.filter(b=>b.status==='pending').length
    const soon = new Date(); soon.setDate(soon.getDate()+7)
    const expiring  = rentalData.filter(r=>r.status==='active'&&new Date(r.expiry_date)<=soon&&new Date(r.expiry_date)>=new Date()).length
    setStats({ total:roomData.length, occupied, available, pending, expiring, activeRentals: rentalData.filter(r=>r.status==='active').length })
    setLoading(false)
  }

  // Room CRUD
  const openAdd  = () => { setEditRoom({...emptyRoom, floor: floors[0]||'1'}); setRoomError(''); setRoomModal('add') }
  const openEdit = r  => { setEditRoom({...r}); setRoomError(''); setRoomModal('edit') }

  const saveRoom = async () => {
    if (!editRoom.room_number.trim()) { setRoomError('Nomor kamar wajib diisi'); return }
    if (!editRoom.floor) { setRoomError('Pilih lantai'); return }
    if (!editRoom.price_monthly || Number(editRoom.price_monthly) <= 0) { setRoomError('Harga wajib diisi'); return }
    setRoomSaving(true); setRoomError('')
    try {
      const payload = { room_number:editRoom.room_number.trim(), floor:editRoom.floor, type:editRoom.type, price_monthly:Number(editRoom.price_monthly), facilities:editRoom.facilities, description:editRoom.description.trim(), updated_at:new Date().toISOString() }
      if (roomModal==='add') { payload.status='available'; const {error}=await supabase.from('rooms').insert(payload); if(error) throw error }
      else { const {error}=await supabase.from('rooms').update(payload).eq('id',editRoom.id); if(error) throw error }
      setRoomModal(null); await loadAll()
    } catch(e) { setRoomError(e.message.includes('unique')?'Nomor kamar sudah ada':e.message) }
    finally { setRoomSaving(false) }
  }

  const deleteRoom = async r => {
    if (!confirm(`Hapus Kamar ${r.room_number}?`)) return
    await supabase.from('rooms').delete().eq('id', r.id); await loadAll()
  }

  const toggleRoomStatus = async r => {
    // fetch fresh rental data to check if room has active tenant
    const { data: activeRentals } = await supabase.from('rentals').select('id').eq('room_id', r.id).eq('status','active')
    const hasActive = (activeRentals?.length ?? 0) > 0
    const next = r.status==='maintenance' ? (hasActive?'occupied':'available') : 'maintenance'
    const { error } = await supabase.from('rooms').update({status:next}).eq('id',r.id)
    if (error) { alert('Gagal update status: '+error.message); return }
    await loadAll()
  }

  const toggleFacility = f => setEditRoom(r => ({...r, facilities: r.facilities.includes(f)?r.facilities.filter(x=>x!==f):[...r.facilities,f]}))


  const kickTenant = async (rental) => {
    if (!confirm(`Keluarkan ${rental.profiles?.full_name} dari Kamar ${rental.rooms?.room_number}? Tindakan ini tidak bisa dibatalkan.`)) return
    const { error: e1 } = await supabase.from('rentals').update({ status:'terminated' }).eq('id', rental.id)
    if (e1) { alert('Gagal: '+e1.message); return }
    await supabase.from('rooms').update({ status:'available' }).eq('id', rental.room_id)
    await loadAll()
  }

  // Floor manager
  const addFloor = () => {
    const f = newFloor.trim()
    if (!f || floors.includes(f)) return
    setFloors(prev => [...prev, f].sort((a,b)=>Number(a)-Number(b)))
    setNewFloor('')
  }
  const deleteFloor = async f => {
    const hasRooms = rooms.some(r => String(r.floor)===f)
    if (hasRooms) { alert(`Lantai ${f} masih memiliki kamar. Hapus kamarnya dulu.`); return }
    setFloors(prev => prev.filter(x=>x!==f))
  }

  // Booking review
  const openReview = (b, action) => { setReviewModal(b); setReviewAction(action); setReviewNotes('') }
  const submitReview = async () => {
    if (reviewAction==='rejected' && !reviewNotes.trim()) return
    setReviewSaving(true)
    const { error } = await supabase.from('booking_requests').update({ status:reviewAction, admin_notes:reviewNotes.trim()||null, reviewed_at:new Date().toISOString() }).eq('id', reviewModal.id)
    if (!error) { setReviewModal(null); await loadAll() }
    setReviewSaving(false)
  }

  // Profile save
  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg('')
    const { error } = await supabase.from('profiles').update({ full_name:profileForm.full_name, phone:profileForm.phone }).eq('id', profile.id)
    if (error) setProfileMsg('❌ '+error.message)
    else { setProfileMsg('✅ Profil berhasil diperbarui!'); setProfile(p=>({...p,...profileForm})) }
    setSavingProfile(false)
  }

  const savePassword = async () => {
    if (pwdForm.new !== pwdForm.confirm) { setPwdMsg('❌ Password tidak cocok'); return }
    if (pwdForm.new.length < 6) { setPwdMsg('❌ Min. 6 karakter'); return }
    setSavingPwd(true); setPwdMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwdForm.new })
    if (error) setPwdMsg('❌ '+error.message)
    else { setPwdMsg('✅ Password berhasil diubah!'); setPwdForm({new:'',confirm:''}) }
    setSavingPwd(false)
  }

  const filteredRooms = floorFilter==='all' ? rooms : rooms.filter(r=>String(r.floor)===floorFilter)

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg}`} style={{fontFamily:'DM Sans,system-ui,sans-serif'}}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${hdr} backdrop-blur-xl border-b`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={onBack} className={`flex items-center gap-1.5 ${sub} hover:${txt} text-sm transition-colors`}><ArrowLeft size={15}/> Beranda</button>
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center text-black text-xs font-bold`}>K</span>
            <span style={{fontFamily:SERIF}} className={`${txt} font-semibold text-sm`}>Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className={`p-2 rounded-lg ${dark?'bg-white/5 text-slate-400 hover:text-white':'bg-gray-100 text-gray-500 hover:text-gray-900'} transition-colors`}><RefreshCw size={14}/></button>
            <button onClick={toggle} className={`p-2 rounded-lg ${dark?'bg-white/5 text-amber-400':'bg-gray-100 text-amber-500'} transition-colors`}>{dark?<Sun size={14}/>:<Moon size={14}/>}</button>
            <button onClick={onSignOut} className="p-2 rounded-lg text-red-400/60 hover:text-red-400 transition-colors"><LogOut size={14}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-7 pb-24">
        {/* Welcome */}
        <div className="mb-6">
          <p className={`${sub} text-sm`}>Selamat datang kembali</p>
          <h1 style={{fontFamily:SERIF}} className={`text-2xl font-bold ${txt}`}><span className="font-normal">{profile?.full_name}</span> — <em className="text-amber-400">Administrator</em></h1>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              {l:'Total Kamar', v:stats.total, icon:'🏠'},
              {l:'Terisi', v:stats.occupied, icon:'🔔'},
              {l:'Kosong', v:stats.available, icon:'🔑'},
              {l:'Penyewa Aktif', v:stats.activeRentals, icon:'👥'},
              {l:'Booking Baru', v:stats.pending, icon:'📋', hi:stats.pending>0},
            ].map(s=>(
              <div key={s.l} className={`p-4 rounded-2xl border ${s.hi?'bg-amber-500/8 border-amber-500/20':dark?'bg-slate-900/60 border-slate-800':'bg-white border-gray-200'}`}>
                <p className={`${sub} text-xs mb-1`}>{s.l}</p>
                <p className={`text-2xl font-bold ${s.hi?'text-amber-400':txt}`} style={{fontFamily:SERIF}}>{s.v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-1 p-1 ${dark?'bg-white/5 border-slate-800':'bg-gray-100 border-gray-200'} border rounded-2xl mb-6 overflow-x-auto`}>
          {[
            {id:'overview',l:'Overview',I:Home},
            {id:'bookings',l:'Pemesanan',I:ClipboardList,b:stats?.pending},
            {id:'rooms',l:'Kamar',I:DoorOpen},
            {id:'tenants',l:'Penyewa',I:Users},
            {id:'profile',l:'Profil',I:Edit3},
          ].map(({id,l,I,b})=>(
            <button key={id} onClick={()=>setTab(id)} className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab===id?'bg-amber-400 text-black':dark?'text-slate-400 hover:text-white':'text-gray-500 hover:text-gray-900'}`}>
              <I size={13}/>{l}
              {b>0&&<span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${tab===id?'bg-black/20 text-black':'bg-amber-400 text-black'}`}>{b}</span>}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==='overview' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Occupancy */}
            <div className={`p-6 rounded-2xl border ${card}`}>
              <h3 className={`${txt} font-semibold text-sm mb-4`}>Tingkat Hunian</h3>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-bold text-amber-400" style={{fontFamily:SERIF}}>{stats?.total?Math.round(stats.occupied/stats.total*100):0}%</span>
                <span className={`${sub} text-sm mb-1`}>{stats?.occupied}/{stats?.total} kamar</span>
              </div>
              <div className={`h-2 rounded-full ${dark?'bg-slate-800':'bg-gray-200'} overflow-hidden mb-3`}>
                <motion.div initial={{width:0}} animate={{width:`${stats?.total?stats.occupied/stats.total*100:0}%`}} transition={{duration:1,ease:[.22,1,.36,1]}} className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"/>
              </div>
            </div>

            {/* Expiring soon */}
            <div className={`p-6 rounded-2xl border ${card}`}>
              <h3 className={`${txt} font-semibold text-sm mb-4`}>Sewa Berakhir ≤7 Hari</h3>
              {rentals.filter(r=>{const e=new Date(r.expiry_date),s=new Date();s.setDate(s.getDate()+7);return r.status==='active'&&e<=s&&e>=new Date()}).length>0 ? (
                <div className="space-y-2">
                  {rentals.filter(r=>{const e=new Date(r.expiry_date),s=new Date();s.setDate(s.getDate()+7);return r.status==='active'&&e<=s&&e>=new Date()}).map(r=>{
                    const dl=daysLeft(r.expiry_date)
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl ${dark?'bg-amber-500/5 border-amber-500/15':'bg-amber-50 border-amber-200'} border`}>
                        <div>
                          <p className={`${txt} text-sm font-medium`}>{r.profiles?.full_name??'—'}</p>
                          <p className={`${sub} text-xs`}>Kamar {r.rooms?.room_number} · berakhir {fmtDate(r.expiry_date)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${dl<=3?'bg-red-500/10 text-red-400':'bg-amber-500/10 text-amber-400'}`}>{dl} hari</span>
                      </div>
                    )
                  })}
                </div>
              ) : <p className={`${sub} text-sm`}>Tidak ada yang akan berakhir segera 👍</p>}
            </div>

            {/* Pending bookings */}
            <div className={`p-6 rounded-2xl border ${card} md:col-span-2`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${txt} font-semibold text-sm`}>Booking Menunggu</h3>
                {stats?.pending>0&&<button onClick={()=>setTab('bookings')} className="text-amber-400 text-xs hover:underline">Lihat semua →</button>}
              </div>
              {bookings.filter(b=>b.status==='pending').length>0 ? (
                <div className="space-y-2">
                  {bookings.filter(b=>b.status==='pending').slice(0,4).map(b=>(
                    <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl ${dark?'bg-white/3 border-white/5':'bg-gray-50 border-gray-100'} border`}>
                      <div>
                        <p className={`${txt} text-sm font-medium`}>{b.profiles?.full_name}</p>
                        <p className={`${sub} text-xs`}>Kamar {b.rooms?.room_number} · {b.duration_months} bulan · check-in {fmtDate(b.check_in_date)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>openReview(b,'approved')} className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20"><Check size={13}/></button>
                        <button onClick={()=>openReview(b,'rejected')} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20"><X size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className={`${sub} text-sm`}>Tidak ada booking baru 👍</p>}
            </div>
          </motion.div>
        )}

        {/* ══ BOOKINGS ══ */}
        {tab==='bookings' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${txt} font-semibold`}>Semua Permintaan Sewa</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">{bookings.filter(b=>b.status==='pending').length} Pending</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{bookings.filter(b=>b.status==='approved').length} Disetujui</span>
              </div>
            </div>
            {bookings.length===0 ? (
              <div className="text-center py-14"><ClipboardList size={36} className={`${sub} mx-auto mb-3`}/><p className={sub}>Belum ada permintaan sewa</p></div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((b,i)=>{
                  const rental = rentals.find(r=>r.room_id===b.room_id&&r.tenant_id===b.tenant_id)
                  const dl = rental ? daysLeft(rental.expiry_date) : null
                  return (
                    <motion.div key={b.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}
                      className={`p-5 rounded-2xl border ${b.status==='pending'?dark?'bg-slate-900/80 border-slate-700':'bg-white border-gray-200':b.status==='approved'?'bg-emerald-500/5 border-emerald-500/20':'bg-red-500/5 border-red-500/15'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className={`${txt} font-semibold`}>{b.profiles?.full_name}</p>
                            <BookPill status={b.status}/>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                            <MiniInfo label="Kamar" value={`${b.rooms?.room_number} (${b.rooms?.type})`} dark={dark} txt={txt} sub={sub}/>
                            <MiniInfo label="Check-in" value={fmtDate(b.check_in_date)} dark={dark} txt={txt} sub={sub}/>
                            <MiniInfo label="Durasi" value={`${b.duration_months} bulan`} dark={dark} txt={txt} sub={sub}/>
                            <MiniInfo label="No. HP" value={b.profiles?.phone??'—'} dark={dark} txt={txt} sub={sub}/>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <MiniInfo label="No. KTP" value={b.id_number??'—'} dark={dark} txt={txt} sub={sub}/>
                            <MiniInfo label="Pekerjaan" value={b.occupation??'—'} dark={dark} txt={txt} sub={sub}/>
                          </div>
                          {/* Show days remaining for approved bookings */}
                          {b.status==='approved' && rental && (
                            <div className={`flex items-center gap-2 p-2.5 rounded-xl mt-2 ${dl<=7?'bg-amber-500/10 border-amber-500/20':'bg-emerald-500/10 border-emerald-500/20'} border`}>
                              <Bell size={12} className={dl<=7?'text-amber-400':'text-emerald-400'}/>
                              <p className={`text-xs font-medium ${dl<=7?'text-amber-400':'text-emerald-400'}`}>
                                Sewa berakhir {fmtDate(rental.expiry_date)} · {dl} hari lagi
                              </p>
                            </div>
                          )}
                          {b.admin_notes&&<div className={`p-2.5 rounded-xl mt-2 text-xs ${b.status==='approved'?'bg-emerald-500/10 text-emerald-300':'bg-red-500/10 text-red-300'}`}><span className="font-semibold">Catatan: </span>{b.admin_notes}</div>}
                          <p className={`${sub} text-xs mt-2 opacity-60`}>Diajukan {fmtDate(b.created_at)}</p>
                        </div>
                        {b.status==='pending'&&(
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            <button onClick={()=>openReview(b,'approved')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold"><CheckCircle size={15}/> Setujui</button>
                            <button onClick={()=>openReview(b,'rejected')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold"><XCircle size={15}/> Tolak</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ ROOMS ══ */}
        {tab==='rooms' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${txt} font-semibold`}>Kelola Kamar</h3>
              <div className="flex gap-2">
                <button onClick={()=>setShowFloorMgr(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium ${dark?'border-white/10 text-slate-400 hover:text-white':'border-gray-200 text-gray-500 hover:text-gray-900'} transition-all`}><Filter size={12}/> Kelola Lantai</button>
                <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold"><Plus size={14}/> Tambah Kamar</button>
              </div>
            </div>

            {/* Floor filter */}
            {floors.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <button onClick={()=>setFloorFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${floorFilter==='all'?'bg-amber-400 text-black':dark?'bg-white/5 border border-slate-700 text-slate-400 hover:text-white':'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900'}`}>Semua</button>
                {floors.map(f=>(
                  <button key={f} onClick={()=>setFloorFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${floorFilter===f?'bg-amber-400 text-black':dark?'bg-white/5 border border-slate-700 text-slate-400 hover:text-white':'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900'}`}>Lantai {f}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room,i)=>(
                <motion.div key={room.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                  className={`p-5 rounded-2xl border transition-all group ${room.status==='occupied'?'bg-indigo-500/5 border-indigo-500/20':room.status==='maintenance'?'bg-amber-500/5 border-amber-500/20':dark?'bg-slate-900/60 border-slate-800':'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`${txt} font-bold text-lg`}>Kamar {room.room_number}</p>
                        <RoomStatusBadge status={room.status}/>
                      </div>
                      <p className={`${sub} text-xs capitalize`}>Lantai {room.floor} · {room.type}</p>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(room)} className={`w-7 h-7 rounded-lg ${dark?'bg-white/5 border-white/10 text-slate-400 hover:text-white':'bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-900'} border flex items-center justify-center`}><Pencil size={12}/></button>
                      <button onClick={()=>toggleRoomStatus(room)} className={`w-7 h-7 rounded-lg ${dark?'bg-white/5 border-white/10 text-slate-400 hover:text-amber-400':'bg-gray-100 border-gray-200 text-gray-400 hover:text-amber-500'} border flex items-center justify-center`} title={room.status==='maintenance'?'Set Available':'Set Maintenance'}><Wrench size={12}/></button>
                      {room.status==='available'&&<button onClick={()=>deleteRoom(room)} className={`w-7 h-7 rounded-lg ${dark?'bg-white/5 border-white/10 text-slate-400 hover:text-red-400':'bg-gray-100 border-gray-200 text-gray-400 hover:text-red-500'} border flex items-center justify-center`}><Trash2 size={12}/></button>}
                    </div>
                  </div>
                  <p className="text-amber-400 font-bold mb-3">{fmtIDR(room.price_monthly)}<span className={`${sub} text-xs font-normal`}>/bulan</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.facilities?.map((f,j)=><span key={j} className={`px-2 py-0.5 rounded-md text-xs ${dark?'bg-slate-800 text-slate-400':'bg-gray-100 text-gray-500'}`}>{f}</span>)}
                  </div>
                </motion.div>
              ))}
              {filteredRooms.length===0&&(
                <div className="col-span-3 text-center py-14"><DoorOpen size={36} className={`${sub} mx-auto mb-3`}/><p className={`${sub} text-sm mb-4`}>Belum ada kamar{floorFilter!=='all'?` di lantai ${floorFilter}`:''}</p><button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black font-bold text-sm"><Plus size={15}/> Tambah Kamar</button></div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ TENANTS ══ */}
        {tab==='tenants' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <h3 className={`${txt} font-semibold mb-4`}>Data Penyewa</h3>
            <div className={`rounded-2xl border ${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className={`border-b ${dark?'border-slate-800':'border-gray-200'}`}>
                    {['Penyewa','Kamar','Mulai','Berakhir','Sisa','Status','Aksi'].map(h=>(
                      <th key={h} className={`text-left px-5 py-4 ${sub} text-xs font-semibold uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className={`divide-y ${dark?'divide-slate-800/50':'divide-gray-100'}`}>
                    {rentals.filter(r=>r.status==='active'||r.status==='pending_payment').map((r,i)=>{
                      const dl = daysLeft(r.expiry_date)
                      const urgent = r.status==='active' && dl <= 7
                      return (
                        <motion.tr key={r.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.04}} className={`${dark?'hover:bg-slate-800/30':'hover:bg-gray-50'} transition-colors`}>
                          <td className="px-5 py-4"><p className={`${txt} text-sm font-medium`}>{r.profiles?.full_name??'—'}</p><p className={`${sub} text-xs`}>{r.profiles?.phone??'—'}</p></td>
                          <td className={`px-5 py-4 ${sub} text-sm`}>{r.rooms?.room_number??'—'}</td>
                          <td className={`px-5 py-4 ${sub} text-sm`}>{fmtDate(r.start_date)}</td>
                          <td className="px-5 py-4"><p className={`text-sm ${urgent?'text-amber-400':sub}`}>{fmtDate(r.expiry_date)}</p></td>
                          <td className="px-5 py-4">
                            {r.status==='active' ? (
                              <span className={`text-sm font-semibold ${dl<=3?'text-red-400':dl<=7?'text-amber-400':'text-emerald-400'}`}>{dl} hari</span>
                            ) : <span className="text-amber-400 text-xs">Menunggu bayar</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${r.status==='active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':r.status==='pending_payment'?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-slate-500/10 text-slate-400 border-slate-700'}`}>
                              {r.status==='active'?'Aktif':r.status==='pending_payment'?'Belum Bayar':'Berakhir'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={()=>kickTenant(r)} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all">Kick</button>
                          </td>
                        </motion.tr>
                      )
                    })}
                    {rentals.filter(r=>r.status==='active'||r.status==='pending_payment').length===0&&(
                      <tr><td colSpan={7} className={`px-5 py-12 text-center ${sub} text-sm`}>Belum ada data penyewa</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ PROFILE ══ */}
        {tab==='profile' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="max-w-lg space-y-4">
            {/* Info */}
            <div className={`p-6 rounded-3xl border ${card}`}>
              <div className="flex items-center gap-2 mb-5"><Edit3 size={16} className="text-amber-400"/><h3 className={`${txt} font-semibold`}>Informasi Admin</h3></div>
              <div className="space-y-3">
                <div><label className={`${sub} text-xs mb-1 block`}>Nama Lengkap</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.full_name} onChange={e=>setProfileForm(f=>({...f,full_name:e.target.value}))}/></div>
                <div><label className={`${sub} text-xs mb-1 block`}>No. Telepon</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              {profileMsg&&<p className="text-sm mt-3">{profileMsg}</p>}
              <button onClick={saveProfile} disabled={savingProfile} className="mt-4 w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14}/>{savingProfile?'Menyimpan...':'Simpan Perubahan'}
              </button>
            </div>
            {/* Password */}
            <div className={`p-6 rounded-3xl border ${card}`}>
              <div className="flex items-center gap-2 mb-5"><Lock size={16} className="text-amber-400"/><h3 className={`${txt} font-semibold`}>Ganti Password</h3></div>
              <div className="space-y-3">
                <div className="relative"><label className={`${sub} text-xs mb-1 block`}>Password Baru</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} type={showPwd?'text':'password'} value={pwdForm.new} onChange={e=>setPwdForm(p=>({...p,new:e.target.value}))} placeholder="Min. 6 karakter"/><button onClick={()=>setShowPwd(v=>!v)} className={`absolute right-3 top-8 ${sub}`}>{showPwd?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>
                <div><label className={`${sub} text-xs mb-1 block`}>Konfirmasi Password</label><input className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-amber-400/50 ${inp}`} type={showPwd?'text':'password'} value={pwdForm.confirm} onChange={e=>setPwdForm(p=>({...p,confirm:e.target.value}))} placeholder="Ulangi password baru"/></div>
              </div>
              {pwdMsg&&<p className="text-sm mt-3">{pwdMsg}</p>}
              <button onClick={savePassword} disabled={savingPwd} className="mt-4 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Lock size={14}/>{savingPwd?'Mengubah...':'Ubah Password'}
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* ══ MODAL: Floor Manager ══ */}
      <AnimatePresence>
        {showFloorMgr&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setShowFloorMgr(false)}/>
            <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}} className="relative w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500"/>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 style={{fontFamily:SERIF}} className="text-lg font-bold text-white">Kelola Lantai</h3>
                  <button onClick={()=>setShowFloorMgr(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button>
                </div>
                <div className="space-y-2 mb-4">
                  {floors.map(f=>(
                    <div key={f} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                      <span className="text-white text-sm font-medium">Lantai {f}</span>
                      <button onClick={()=>deleteFloor(f)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20"><Trash2 size={12}/></button>
                    </div>
                  ))}
                  {floors.length===0&&<p className="text-white/30 text-sm text-center py-4">Belum ada lantai</p>}
                </div>
                <div className="flex gap-2">
                  <input value={newFloor} onChange={e=>setNewFloor(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFloor()} placeholder="Nomor lantai baru (cth: 4)" className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 placeholder-white/20"/>
                  <button onClick={addFloor} className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm"><Plus size={15}/></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL: Add/Edit Room ══ */}
      <AnimatePresence>
        {roomModal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setRoomModal(null)}/>
            <motion.div initial={{opacity:0,y:50,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30}} transition={{type:'spring',stiffness:300,damping:30}} className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 shrink-0"/>
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/6 shrink-0">
                <h3 style={{fontFamily:SERIF}} className="text-lg font-bold text-white">{roomModal==='add'?'Tambah Kamar Baru':'Edit Kamar'}</h3>
                <button onClick={()=>setRoomModal(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-white/40 mb-1.5">Nomor Kamar *</label><input value={editRoom.room_number} onChange={e=>setEditRoom(r=>({...r,room_number:e.target.value}))} placeholder="101" className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40"/></div>
                    <div><label className="block text-xs font-medium text-white/40 mb-1.5">Lantai</label>
                      <select value={editRoom.floor} onChange={e=>setEditRoom(r=>({...r,floor:e.target.value}))} className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 appearance-none">
                        {floors.length>0 ? floors.map(f=><option key={f} value={f} className="bg-[#111]">Lantai {f}</option>) : <option value="" className="bg-[#111]">Tambah lantai dulu</option>}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs font-medium text-white/40 mb-2">Tipe Kamar</label><div className="flex gap-2">{ROOM_TYPES.map(t=><button key={t} onClick={()=>setEditRoom(r=>({...r,type:t}))} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${editRoom.type===t?'bg-amber-400/10 border-amber-400/40 text-amber-300':'bg-white/3 border-white/8 text-white/40 hover:text-white'}`}>{t}</button>)}</div></div>
                  <div><label className="block text-xs font-medium text-white/40 mb-1.5">Harga per Bulan (Rp) *</label><input type="number" value={editRoom.price_monthly} onChange={e=>setEditRoom(r=>({...r,price_monthly:e.target.value}))} placeholder="800000" className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40"/>{editRoom.price_monthly&&<p className="text-amber-400/60 text-xs mt-1">{fmtIDR(editRoom.price_monthly)}</p>}</div>
                  <div><label className="block text-xs font-medium text-white/40 mb-2">Fasilitas</label><div className="flex flex-wrap gap-2">{FACILITY_OPTIONS.map(f=><button key={f} onClick={()=>toggleFacility(f)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${editRoom.facilities.includes(f)?'bg-amber-400/10 border-amber-400/30 text-amber-300':'bg-white/3 border-white/8 text-white/40 hover:text-white'}`}>{editRoom.facilities.includes(f)&&'✓ '}{f}</button>)}</div></div>
                  <div><label className="block text-xs font-medium text-white/40 mb-1.5">Deskripsi (opsional)</label><textarea value={editRoom.description} onChange={e=>setEditRoom(r=>({...r,description:e.target.value}))} rows={2} placeholder="Deskripsi singkat..." className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 resize-none"/></div>
                  {roomError&&<div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15"><X size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-sm">{roomError}</p></div>}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/6 shrink-0">
                <div className="flex gap-2">
                  <button onClick={()=>setRoomModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm font-medium">Batal</button>
                  <button onClick={saveRoom} disabled={roomSaving} className="flex-[2] py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {roomSaving?<><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"/>Menyimpan...</>:<><Save size={15}/>{roomModal==='add'?'Tambah Kamar':'Simpan'}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL: Review Booking ══ */}
      <AnimatePresence>
        {reviewModal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setReviewModal(null)}/>
            <motion.div initial={{opacity:0,scale:.92,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94}} transition={{type:'spring',stiffness:300,damping:30}} className="relative w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className={`h-1 ${reviewAction==='approved'?'bg-emerald-500':'bg-red-500'}`}/>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 style={{fontFamily:SERIF}} className="text-lg font-bold text-white">{reviewAction==='approved'?'✅ Setujui Booking':'❌ Tolak Booking'}</h3>
                  <button onClick={()=>setReviewModal(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button>
                </div>
                <div className="p-4 rounded-2xl bg-white/3 border border-white/6 mb-5">
                  <p className="text-white font-semibold">{reviewModal.profiles?.full_name}</p>
                  <p className="text-white/40 text-sm">Kamar {reviewModal.rooms?.room_number} · {reviewModal.duration_months} bulan</p>
                  <p className="text-white/40 text-sm">Check-in: {fmtDate(reviewModal.check_in_date)}</p>
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Catatan {reviewAction==='rejected'&&<span className="text-red-400">(wajib)</span>}</label>
                  <textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} rows={3} placeholder={reviewAction==='approved'?'Silakan lakukan pembayaran...':'Alasan penolakan...'} className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 resize-none"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setReviewModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm font-medium">Batal</button>
                  <button onClick={submitReview} disabled={reviewSaving||(reviewAction==='rejected'&&!reviewNotes.trim())} className={`flex-[2] py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 ${reviewAction==='approved'?'bg-emerald-600 hover:bg-emerald-500':'bg-red-600 hover:bg-red-500'}`}>
                    {reviewSaving?<><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/>Memproses...</>:<>{reviewAction==='approved'?<><CheckCircle size={15}/>Setujui</>:<><XCircle size={15}/>Tolak</>}</>}
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

const MiniInfo = ({label,value,txt,sub}) => <div><p className={`${sub} text-xs`}>{label}</p><p className={`${txt} text-sm font-medium`}>{value}</p></div>
const BookPill = ({status}) => { const m={pending:{c:'text-amber-400 bg-amber-500/10 border-amber-500/20',l:'Menunggu'},approved:{c:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',l:'Disetujui'},rejected:{c:'text-red-400 bg-red-500/10 border-red-500/20',l:'Ditolak'}}; const s=m[status]??m.pending; return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${s.c}`}>{s.l}</span> }
const RoomStatusBadge = ({status}) => { const m={available:{c:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',l:'Kosong'},occupied:{c:'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',l:'Terisi'},maintenance:{c:'text-amber-400 bg-amber-500/10 border-amber-500/20',l:'Perawatan'}}; const s=m[status]??m.available; return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${s.c}`}>{s.l}</span> }