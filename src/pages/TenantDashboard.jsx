// src/pages/TenantDashboard.jsx - with booking flow
// See BookingModal.jsx for the booking form component
// This version adds: booking tab, pending/approved alerts, pesan kamar CTA

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import BookingModal from '../components/BookingModal'
import {
  Home, QrCode, CreditCard, Clock, Shield, ChevronRight,
  ArrowLeft, LogOut, Bell, CheckCircle, AlertCircle,
  Wifi, Zap, Droplets, Star, Receipt, Minus, Plus, X,
  User, Phone, ClipboardList, PlusCircle
} from 'lucide-react'

const SERIF  = "Georgia,serif"
const fmtIDR = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n??0)
const fmtD   = s => s ? new Date(s).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "—"

export default function TenantDashboard({ profile, onBack, onSignOut }) {
  const [rental,setRental]   = useState(null)
  const [payments,setPay]    = useState([])
  const [bookings,setBook]   = useState([])
  const [rooms,setRooms]     = useState([])
  const [loading,setLoad]    = useState(true)
  const [tab,setTab]         = useState("overview")
  const [showPay,setShowPay] = useState(false)
  const [showBook,setShowBook] = useState(false)

  useEffect(()=>{ loadData() },[])

  useEffect(()=>{
    const k=import.meta.env.VITE_MIDTRANS_CLIENT_KEY
    if(!k||document.querySelector("script[src*=\"snap.js\"]")) return
    const s=document.createElement("script"); s.src="https://app.sandbox.midtrans.com/snap/snap.js"
    s.setAttribute("data-client-key",k); s.async=true; document.body.appendChild(s)
  },[])

  const loadData=async()=>{
    setLoad(true)
    const [r1,r2,r3,r4]=await Promise.all([
      supabase.from("rentals").select("*,rooms(*)").eq("tenant_id",profile.id).order("created_at",{ascending:false}).limit(1).single(),
      supabase.from("payments").select("*").eq("tenant_id",profile.id).order("created_at",{ascending:false}).limit(10),
      supabase.from("booking_requests").select("*,rooms(room_number,type,floor,price_monthly)").eq("tenant_id",profile.id).order("created_at",{ascending:false}),
      supabase.from("rooms").select("*").eq("status","available").order("room_number"),
    ])
    setRental(r1.data??null); setPay(r2.data??[]); setBook(r3.data??[]); setRooms(r4.data??[])
    setLoad(false)
  }

  const isActive = rental?.status==="active" && new Date(rental?.expiry_date)>=new Date()
  const needsPayment = rental?.status==="pending_payment"
  const daysLeft = rental ? Math.ceil((new Date(rental.expiry_date)-new Date())/86400000) : 0
  const urgent   = isActive && daysLeft<=7
  const pending  = bookings.find(b=>b.status==="pending")
  const approved = bookings.find(b=>b.status==="approved")

  if(loading) return <LoadSkel onBack={onBack}/>

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{fontFamily:"DM Sans,system-ui,sans-serif"}}>
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"><ArrowLeft size={15}/> Beranda</button>
          <span style={{fontFamily:SERIF}} className="text-white font-semibold text-sm">Kostify</span>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-white/30 hover:text-red-400 text-sm transition-colors"><LogOut size={14}/> Keluar</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-7 pb-24">
        <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="mb-6">
          <p className="text-white/30 text-sm">Dashboard Sewa</p>
          <h1 style={{fontFamily:SERIF}} className="text-3xl font-bold text-white mt-0.5">Halo, <span className="italic text-amber-300">{profile?.full_name?.split(" ")[0]}</span> 👋</h1>
        </motion.div>

        <AnimatePresence>
          {urgent&&<motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4"><Bell size={17} className="text-amber-400 animate-pulse"/><div className="flex-1"><p className="text-amber-300 font-semibold text-sm">Sewa berakhir {daysLeft} hari lagi!</p><p className="text-amber-400/50 text-xs">Segera perpanjang</p></div><button onClick={()=>setShowPay(true)} className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold">Perpanjang</button></motion.div>}
          {pending&&!rental&&<motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-4"><ClipboardList size={17} className="text-indigo-400"/><div className="flex-1"><p className="text-indigo-300 font-semibold text-sm">Permintaan sedang diproses</p><p className="text-indigo-400/50 text-xs">Kamar {pending.rooms?.room_number} · Menunggu approval</p></div><button onClick={()=>setTab("booking")} className="text-indigo-400 text-xs underline">Lihat</button></motion.div>}
          {(approved&&!rental||needsPayment)&&<motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-4"><CheckCircle size={17} className="text-emerald-400"/><div className="flex-1"><p className="text-emerald-300 font-semibold text-sm">Disetujui! Silakan bayar</p><p className="text-emerald-400/50 text-xs">Kamar {approved.rooms?.room_number}</p></div><button onClick={()=>setShowPay(true)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold">Bayar</button></motion.div>}
        </AnimatePresence>

        <div className="flex gap-1 p-1 bg-white/5 border border-white/8 rounded-2xl mb-5 overflow-x-auto">
          {[{id:"overview",l:"Ringkasan",I:Home},{id:"qr",l:"QR Akses",I:QrCode},{id:"booking",l:"Pemesanan",I:ClipboardList,b:bookings.filter(x=>x.status==="pending").length},{id:"history",l:"Riwayat",I:Receipt}].map(({id,l,I,b})=>(
            <button key={id} onClick={()=>setTab(id)} className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab===id?"bg-amber-400 text-black":"text-white/40 hover:text-white"}`}>
              <I size={13}/>{l}{b>0&&<span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${tab===id?"bg-black/20 text-black":"bg-amber-400 text-black"}`}>{b}</span>}
            </button>
          ))}
        </div>

        {tab==="overview"&&(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {rental?(
              <>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-white/8 min-h-52">
                  <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15"/>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#0d0d0d]/85 to-transparent"/>
                  <div className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div><p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">Kamar Anda</p><h2 style={{fontFamily:SERIF}} className="text-4xl font-bold text-white">{rental.rooms?.room_number}</h2><p className="text-white/40 text-sm capitalize">Lantai {rental.rooms?.floor} · {rental.rooms?.type}</p></div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${isActive?"bg-emerald-500/10 border-emerald-500/25 text-emerald-400":"bg-red-500/10 border-red-500/20 text-red-400"}`}><div className={`w-1.5 h-1.5 rounded-full ${isActive?"bg-emerald-400 animate-pulse":"bg-red-400"}`}/>{isActive?"Aktif":"Nonaktif"}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[["Mulai",fmtD(rental.start_date),false],["Berakhir",fmtD(rental.expiry_date),!isActive||daysLeft<=7],["Sisa",isActive?`${Math.max(0,daysLeft)} hari`:"Berakhir",!isActive||daysLeft<=7]].map(([l,v,hl])=>(
                        <div key={l} className="p-3 rounded-xl bg-white/5 border border-white/5"><p className="text-white/30 text-xs mb-0.5">{l}</p><p className={`font-semibold text-sm ${hl?"text-amber-400":"text-white"}`}>{v}</p></div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">{rental.rooms?.facilities?.map((f,i)=><span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/50 text-xs">{f.includes("WiFi")?<Wifi size={10}/>:f.includes("AC")?<Zap size={10}/>:f.includes("Mandi")?<Droplets size={10}/>:<Star size={10}/>}{f}</span>)}</div>
                  </div>
                </motion.div>
                <div className="flex flex-col gap-4">
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.1}} className="p-5 rounded-3xl bg-[#111] border border-white/8">
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Harga Sewa</p>
                    <p style={{fontFamily:SERIF}} className="text-2xl font-bold text-amber-400">{fmtIDR(rental.monthly_price??rental.rooms?.price_monthly)}</p>
                    <p className="text-white/20 text-xs">/bulan</p>
                  </motion.div>
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.15}} className="p-5 rounded-3xl bg-[#111] border border-white/8">
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Aksi Cepat</p>
                    <div className="flex flex-col gap-2">
                      {[{I:QrCode,l:"Lihat QR Akses",fn:()=>setTab("qr"),a:false},{I:CreditCard,l:"Perpanjang Sewa",fn:()=>setShowPay(true),a:true},{I:Receipt,l:"Riwayat Bayar",fn:()=>setTab("history"),a:false}].map(({I,l,fn,a})=>(
                        <button key={l} onClick={fn} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all w-full text-left group ${a?"bg-amber-400/8 border-amber-400/20 text-amber-400":"bg-white/3 border-white/5 text-white/40 hover:text-white"}`}><I size={14}/><span className="text-sm font-medium flex-1">{l}</span><ChevronRight size={13} className="opacity-40 group-hover:opacity-100"/></button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </>
            ):(
              <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} className="lg:col-span-3 text-center py-14">
                <div className="w-20 h-20 rounded-3xl bg-[#111] border border-white/8 flex items-center justify-center mx-auto mb-5"><Home size={32} className="text-white/10"/></div>
                <h3 style={{fontFamily:SERIF}} className="text-2xl font-bold text-white mb-2">Belum Ada Kamar</h3>
                <p className="text-white/30 text-sm max-w-xs mx-auto mb-6">{pending?"Permintaan Anda sedang ditinjau admin.":"Pesan kamar dan mulai hunian nyaman Anda."}</p>
                {!pending&&<button onClick={()=>setShowBook(true)} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all"><PlusCircle size={16}/> Pesan Kamar Sekarang</button>}
                {pending&&<button onClick={()=>setTab("booking")} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-indigo-500/30 text-indigo-400 text-sm transition-all"><ClipboardList size={15}/> Lihat Status Permintaan</button>}
              </motion.div>
            )}
          </div>
        )}

        {tab==="qr"&&(
          <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} className="max-w-sm mx-auto">
            <div className="p-7 rounded-3xl bg-[#111] border border-white/8 text-center">
              <div className="flex items-center justify-center gap-2 mb-5"><div className={`w-2 h-2 rounded-full ${isActive?"bg-emerald-400 animate-pulse":"bg-red-400"}`}/><span className={`text-sm font-semibold ${isActive?"text-emerald-400":"text-red-400"}`}>{isActive?"Token Aktif":"Token Nonaktif"}</span></div>
              {rental&&isActive?(
                <>
                  <div className="relative inline-block mb-5"><div className="absolute -inset-3 rounded-3xl bg-amber-400/10 blur-xl"/><div className="relative p-5 rounded-3xl bg-white shadow-2xl"><QRCodeSVG value={rental.access_token} size={190} bgColor="#fff" fgColor="#0f0f1a" level="H"/></div></div>
                  <p style={{fontFamily:SERIF}} className="text-white font-semibold text-lg mb-0.5">Kamar {rental.rooms?.room_number}</p>
                  <p className="text-white/30 text-sm mb-5">Berlaku hingga {fmtD(rental.expiry_date)}</p>
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><Shield size={13} className="text-emerald-400"/><p className="text-emerald-400 text-xs font-medium">Scan di pintu. Rahasiakan QR ini.</p></div>
                </>
              ):(
                <div className="py-8"><div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto mb-4"><QrCode size={28} className="text-white/15"/></div><p className="text-white font-semibold mb-1.5">QR Tidak Aktif</p><p className="text-white/30 text-sm mb-5">{!rental?"Belum ada sewa aktif":"Perpanjang sewa untuk mengaktifkan"}</p>{rental&&<button onClick={()=>setShowPay(true)} className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all">Perpanjang Sewa</button>}</div>
              )}
            </div>
          </motion.div>
        )}

        {tab==="booking"&&(
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Riwayat Pemesanan</h3>
              {needsPayment&&<button onClick={()=>setShowPay(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all">💳 Bayar Sekarang</button>}
              {!rental&&!pending&&<button onClick={()=>setShowBook(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all"><PlusCircle size={13}/> Pesan Kamar</button>}
            </div>
            {bookings.length===0?(
              <div className="text-center py-14"><ClipboardList size={36} className="text-white/10 mx-auto mb-3"/><p className="text-white/30 text-sm mb-4">Belum ada permintaan sewa</p><button onClick={()=>setShowBook(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm"><PlusCircle size={15}/> Pesan Kamar Pertama Anda</button></div>
            ):(
              <div className="flex flex-col gap-3">
                {bookings.map((b,i)=>{
                  const sc={pending:"text-amber-400 bg-amber-500/10 border-amber-500/20",approved:"text-emerald-400 bg-emerald-500/10 border-emerald-500/20",rejected:"text-red-400 bg-red-500/10 border-red-500/20"}
                  const sl={pending:"Menunggu",approved:"Disetujui",rejected:"Ditolak"}
                  return(
                    <motion.div key={b.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.07}} className={`p-5 rounded-2xl border ${b.status==="approved"?"bg-emerald-500/5 border-emerald-500/20":b.status==="rejected"?"bg-red-500/5 border-red-500/15":"bg-white/3 border-white/8"}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div><div className="flex items-center gap-2 mb-0.5"><p className="text-white font-semibold text-sm">Kamar {b.rooms?.room_number}</p><span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${sc[b.status]}`}>{sl[b.status]}</span></div><p className="text-white/30 text-xs capitalize">{b.rooms?.type} · Lantai {b.rooms?.floor}</p></div>
                        <div className="text-right"><p className="text-amber-400 font-semibold text-sm">{fmtIDR(b.rooms?.price_monthly)}</p><p className="text-white/20 text-xs">/bulan</p></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-white/3 border border-white/5"><p className="text-white/30 text-xs">Check-in</p><p className="text-white text-sm font-medium">{fmtD(b.check_in_date)}</p></div>
                        <div className="p-2.5 rounded-xl bg-white/3 border border-white/5"><p className="text-white/30 text-xs">Durasi</p><p className="text-white text-sm font-medium">{b.duration_months} bulan</p></div>
                      </div>
                      {b.admin_notes&&<div className={`p-3 rounded-xl text-xs mb-3 ${b.status==="approved"?"bg-emerald-500/10 text-emerald-300":b.status==="rejected"?"bg-red-500/10 text-red-300":"bg-white/5 text-white/40"}`}><p className="font-semibold mb-0.5">Catatan Admin:</p><p>{b.admin_notes}</p></div>}
                      {b.status==="approved"&&!rental&&<button onClick={()=>setShowPay(true)} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"><CreditCard size={13}/> Bayar untuk Aktivasi Kamar</button>}
                      <p className="text-white/15 text-xs mt-2">Diajukan {fmtD(b.created_at)}</p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab==="history"&&(
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
            {payments.length>0?(
              <div className="flex flex-col gap-3">
                {payments.map((p,i)=>(
                  <motion.div key={p.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.06}} className="flex items-center gap-4 p-5 rounded-2xl bg-[#111] border border-white/8">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.status==="paid"?"bg-emerald-500/10":p.status==="pending"?"bg-amber-500/10":"bg-red-500/10"}`}>{p.status==="paid"?<CheckCircle size={18} className="text-emerald-400"/>:p.status==="pending"?<Clock size={18} className="text-amber-400"/>:<AlertCircle size={18} className="text-red-400"/>}</div>
                    <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm">{p.months_paid} bulan sewa</p><p className="text-white/20 text-xs">{fmtD(p.created_at)}</p></div>
                    <div className="text-right shrink-0"><p className="text-white font-bold">{fmtIDR(p.amount)}</p><span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-semibold ${p.status==="paid"?"bg-emerald-500/10 text-emerald-400":p.status==="pending"?"bg-amber-500/10 text-amber-400":"bg-red-500/10 text-red-400"}`}>{p.status==="paid"?"Lunas":p.status==="pending"?"Pending":"Gagal"}</span></div>
                  </motion.div>
                ))}
              </div>
            ):(
              <div className="text-center py-14"><Receipt size={36} className="text-white/10 mx-auto mb-3"/><p className="text-white/30 text-sm">Belum ada riwayat pembayaran</p></div>
            )}
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {showPay&&rental&&<PayModal rental={rental} onClose={()=>setShowPay(false)} onSuccess={()=>{setShowPay(false);loadData()}}/>}
        {showBook&&<BookingModal rooms={rooms} profile={profile} onClose={()=>setShowBook(false)} onSuccess={()=>{setShowBook(false);loadData();setTab("booking")}}/>}
      </AnimatePresence>
    </div>
  )
}

function PayModal({rental,onClose,onSuccess}){
  const [months,setM]=useState(1); const [loading,setL]=useState(false); const [error,setE]=useState("")
  const price=rental?.monthly_price??rental?.rooms?.price_monthly??0; const total=price*months
  const pay=async()=>{
    setL(true);setE("")
    try{
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
      const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`,"apikey":import.meta.env.VITE_SUPABASE_ANON_KEY},body:JSON.stringify({rental_id:rental.id,months_paid:months})})
      const d=await res.json(); if(!d.success||!d.snap_token) throw new Error(d.error??"Gagal")
      if(!window.snap) throw new Error("Midtrans belum dimuat. Cek VITE_MIDTRANS_CLIENT_KEY")
      window.snap.pay(d.snap_token,{onSuccess:()=>onSuccess(),onPending:()=>{setE("Selesaikan pembayaran.");setL(false)},onError:()=>{setE("Gagal, coba lagi.");setL(false)},onClose:()=>setL(false)})
    }catch(e){setE(e.message);setL(false)}
  }
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}/>
      <motion.div initial={{opacity:0,y:50,scale:.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30}} transition={{type:"spring",stiffness:300,damping:30}} className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500"/>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5"><div><h3 style={{fontFamily:"Georgia,serif"}} className="text-xl font-bold text-white">Pembayaran Sewa</h3><p className="text-white/30 text-sm">Kamar {rental?.rooms?.room_number}</p></div><button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white"><X size={15}/></button></div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/8 mb-5">
            <button onClick={()=>setM(m=>Math.max(1,m-1))} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Minus size={15}/></button>
            <div className="flex-1 text-center"><span style={{fontFamily:"Georgia,serif"}} className="text-3xl font-bold text-white">{months}</span><span className="text-white/30 text-sm ml-2">bulan</span></div>
            <button onClick={()=>setM(m=>Math.min(12,m+1))} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Plus size={15}/></button>
          </div>
          <div className="p-4 rounded-2xl bg-white/3 border border-white/6 mb-4">
            <div className="flex justify-between text-sm text-white/40 mb-1.5"><span>{fmtIDR(price)} x {months} bulan</span><span className="text-white">{fmtIDR(total)}</span></div>
            <div className="flex justify-between font-bold pt-2.5 mt-2 border-t border-white/6"><span className="text-white">Total</span><span className="text-amber-400 text-lg">{fmtIDR(total)}</span></div>
          </div>
          {error&&<div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15 mb-4"><AlertCircle size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-xs">{error}</p></div>}
          <button onClick={pay} disabled={loading} className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">{loading?<><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"/>Memuat...</>:<><CreditCard size={16}/> Bayar {fmtIDR(total)}</>}</button>
          <p className="text-center text-white/15 text-xs mt-2.5">🔒 Aman via Midtrans</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

const LoadSkel=({onBack})=><div className="min-h-screen bg-[#0a0a0a]"><div className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-5 h-16 flex items-center justify-between max-w-5xl mx-auto"><button onClick={onBack} className="text-white/40 text-sm">← Beranda</button><div className="w-20 h-4 bg-white/5 rounded animate-pulse"/><div className="w-14 h-4 bg-white/5 rounded animate-pulse"/></div><div className="max-w-5xl mx-auto px-5 py-7 grid gap-4 grid-cols-1 lg:grid-cols-3"><div className="lg:col-span-2 h-52 rounded-3xl bg-white/3 animate-pulse"/><div className="flex flex-col gap-4"><div className="h-36 rounded-3xl bg-white/3 animate-pulse"/><div className="h-36 rounded-3xl bg-white/3 animate-pulse"/></div></div></div>