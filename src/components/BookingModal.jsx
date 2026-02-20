// src/components/BookingModal.jsx
// Modal pemesanan kamar — muncul ketika user klik "Pesan Kamar" dari dashboard

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import {
  X, Home, User, Phone, CreditCard, Briefcase, Calendar,
  MessageSquare, AlertCircle, CheckCircle, ArrowRight,
  Hash, Clock, ChevronDown
} from 'lucide-react'

const FONT_SERIF = 'Georgia, "Times New Roman", serif'
const FONT_SANS  = "'DM Sans', system-ui, sans-serif"

export default function BookingModal({ rooms, profile, onClose, onSuccess }) {
  const [step, setStep]         = useState(1)   // 1: pilih kamar, 2: isi form, 3: sukses
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    full_name:         profile?.full_name ?? '',
    phone:             profile?.phone ?? '',
    id_number:         '',
    occupation:        '',
    emergency_contact: '',
    check_in_date:     '',
    duration_months:   1,
    message:           '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!form.full_name.trim())    return 'Nama lengkap wajib diisi'
    if (!form.phone.trim())        return 'Nomor HP wajib diisi'
    if (!form.id_number.trim())    return 'Nomor KTP wajib diisi'
    if (form.id_number.length < 16) return 'Nomor KTP harus 16 digit'
    if (!form.check_in_date)       return 'Tanggal masuk wajib diisi'
    const today = new Date(); today.setHours(0,0,0,0)
    if (new Date(form.check_in_date) < today) return 'Tanggal masuk tidak boleh sebelum hari ini'
    return null
  }

  const handleSubmit = async () => {
    const err = validateForm()
    if (err) { setError(err); return }
    setLoading(true); setError('')

    try {
      const { error } = await supabase.from('booking_requests').insert({
        tenant_id:         profile.id,
        room_id:           selectedRoom.id,
        full_name:         form.full_name.trim(),
        phone:             form.phone.trim(),
        id_number:         form.id_number.trim(),
        occupation:        form.occupation.trim(),
        emergency_contact: form.emergency_contact.trim(),
        check_in_date:     form.check_in_date,
        duration_months:   Number(form.duration_months),
        message:           form.message.trim(),
        status:            'pending',
      })
      if (error) throw error
      setStep(3)
    } catch (err) {
      if (err.message?.includes('duplicate')) setError('Anda sudah pernah mengajukan permintaan untuk kamar ini')
      else setError(err.message ?? 'Gagal mengirim permintaan')
    } finally { setLoading(false) }
  }

  const availableRooms = rooms.filter(r => r.status === 'available')

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ fontFamily: FONT_SANS }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={step < 3 ? onClose : undefined} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="relative w-full sm:max-w-lg bg-[#0c0c0c] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6 shrink-0">
          <div>
            <h2 style={{ fontFamily: FONT_SERIF }} className="text-lg font-bold text-white">
              {step === 1 ? 'Pilih Kamar' : step === 2 ? 'Data Pemesanan' : 'Permintaan Terkirim!'}
            </h2>
            {step < 3 && (
              <div className="flex items-center gap-1.5 mt-1">
                {[1,2].map(s => (
                  <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-amber-400' : s < step ? 'w-4 bg-amber-400/50' : 'w-4 bg-white/10'}`} />
                ))}
                <span className="text-white/30 text-xs ml-1">Langkah {step} dari 2</span>
              </div>
            )}
          </div>
          {step < 3 && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body - scrollable */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: Pilih Kamar ── */}
          {step === 1 && (
            <div className="p-5">
              {availableRooms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
                    <Home size={28} className="text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">Tidak ada kamar tersedia saat ini</p>
                  <p className="text-white/20 text-xs mt-1">Silakan hubungi admin</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-white/40 text-sm mb-1">{availableRooms.length} kamar tersedia — pilih yang Anda inginkan</p>
                  {availableRooms.map(room => (
                    <motion.button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        selectedRoom?.id === room.id
                          ? 'bg-amber-400/10 border-amber-400/40'
                          : 'bg-white/3 border-white/8 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Radio */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            selectedRoom?.id === room.id ? 'border-amber-400 bg-amber-400' : 'border-white/20'
                          }`}>
                            {selectedRoom?.id === room.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white font-semibold text-sm">Kamar {room.room_number}</p>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-xs capitalize">{room.type}</span>
                            </div>
                            <p className="text-white/40 text-xs">Lantai {room.floor}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {room.facilities?.slice(0,3).map((f,i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 text-xs">{f}</span>
                              ))}
                              {(room.facilities?.length ?? 0) > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 text-xs">+{room.facilities.length-3} lagi</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-amber-400 font-bold text-sm">{fmtIDR(room.price_monthly)}</p>
                          <p className="text-white/30 text-xs">/bulan</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Form Data ── */}
          {step === 2 && selectedRoom && (
            <div className="p-5">
              {/* Ringkasan kamar terpilih */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-400/8 border border-amber-400/20 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
                  <Home size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-300 font-semibold text-sm">Kamar {selectedRoom.room_number}</p>
                  <p className="text-amber-400/60 text-xs">Lantai {selectedRoom.floor} · {fmtIDR(selectedRoom.price_monthly)}/bulan</p>
                </div>
                <button onClick={() => setStep(1)} className="text-amber-400/50 hover:text-amber-400 text-xs underline transition-colors">Ganti</button>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Data Diri</p>

                <FormField icon={User}        label="Nama Lengkap *"           name="full_name"         value={form.full_name}         onChange={handleChange} placeholder="Sesuai KTP" />
                <FormField icon={Phone}       label="Nomor HP / WhatsApp *"    name="phone"             value={form.phone}             onChange={handleChange} placeholder="08123456789" type="tel" />
                <FormField icon={CreditCard}  label="Nomor KTP * (16 digit)"   name="id_number"         value={form.id_number}         onChange={handleChange} placeholder="3201xxxxxxxxxxxxxxxx" maxLength={16} />
                <FormField icon={Briefcase}   label="Pekerjaan"                name="occupation"        value={form.occupation}        onChange={handleChange} placeholder="Mahasiswa / Karyawan / dll" />
                <FormField icon={Phone}       label="Kontak Darurat"           name="emergency_contact" value={form.emergency_contact} onChange={handleChange} placeholder="Nama — Nomor HP (hubungan)" />

                <div className="border-t border-white/5 pt-4 mt-1">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">Rencana Sewa</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={Calendar} label="Tanggal Masuk *" name="check_in_date" value={form.check_in_date} onChange={handleChange} type="date" min={today()} />
                    {/* Durasi */}
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                        <Clock size={12} /> Durasi Sewa *
                      </label>
                      <div className="relative">
                        <select name="duration_months" value={form.duration_months} onChange={handleChange}
                          className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all appearance-none">
                          {[1,2,3,4,5,6,9,12].map(m => (
                            <option key={m} value={m} className="bg-[#111]">{m} bulan</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Estimasi biaya */}
                  {form.check_in_date && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 rounded-xl bg-white/3 border border-white/6">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>{fmtIDR(selectedRoom.price_monthly)} × {form.duration_months} bulan</span>
                        <span>Estimasi total</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-xs">Mulai {fmtDate(form.check_in_date)}</span>
                        <span className="text-amber-400 font-bold">{fmtIDR(selectedRoom.price_monthly * form.duration_months)}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Pesan */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Pesan untuk Admin (opsional)
                  </label>
                  <textarea
                    name="message" value={form.message} onChange={handleChange}
                    placeholder="Contoh: apakah bisa survei kamar dulu? Ada pertanyaan tentang fasilitas?"
                    rows={3}
                    className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-400/40 transition-all resize-none"
                  />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── STEP 3: Sukses ── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle size={38} className="text-emerald-400" />
              </motion.div>
              <h3 style={{ fontFamily: FONT_SERIF }} className="text-2xl font-bold text-white mb-2">Permintaan Terkirim!</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Admin akan meninjau permintaan Anda untuk <strong className="text-white">Kamar {selectedRoom?.room_number}</strong>.
                Biasanya diproses dalam <strong className="text-amber-400">1×24 jam</strong>.
              </p>
              <div className="flex flex-col gap-2 text-left mb-6">
                {[
                  '✅ Jika disetujui, Anda akan melihat status "Approved" di dashboard',
                  '💳 Setelah approved, Anda bisa melakukan pembayaran',
                  '🔑 QR akses aktif otomatis setelah pembayaran berhasil',
                ].map((t, i) => (
                  <div key={i} className="px-4 py-2.5 rounded-xl bg-white/3 border border-white/6 text-white/50 text-sm">{t}</div>
                ))}
              </div>
              <button onClick={onSuccess}
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                Lihat Status di Dashboard <ArrowRight size={15} />
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer actions */}
        {step < 3 && (
          <div className="p-5 border-t border-white/6 shrink-0">
            {step === 1 ? (
              <motion.button
                onClick={() => selectedRoom && setStep(2)}
                disabled={!selectedRoom}
                whileHover={{ scale: selectedRoom ? 1.01 : 1 }}
                whileTap={{ scale: selectedRoom ? 0.99 : 1 }}
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {selectedRoom ? `Lanjut — Kamar ${selectedRoom.room_number}` : 'Pilih Kamar Dahulu'}
                {selectedRoom && <ArrowRight size={15} />}
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setStep(1); setError('') }}
                  className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/50 hover:text-white text-sm font-medium transition-all">
                  ← Kembali
                </button>
                <motion.button
                  onClick={handleSubmit} disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="flex-[2] py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Mengirim...</>
                    : <>Kirim Permintaan Sewa <ArrowRight size={15} /></>
                  }
                </motion.button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────
function FormField({ icon: Icon, label, name, value, onChange, type = 'text', placeholder, min, maxLength }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-white/40 mb-1.5">
        <Icon size={12} /> {label}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} min={min} maxLength={maxLength}
        className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-400/40 transition-all"
      />
    </div>
  )
}

const fmtIDR  = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
const today   = () => new Date().toISOString().split('T')[0]
