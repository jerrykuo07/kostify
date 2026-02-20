// src/components/AuthModal.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, X, ArrowRight } from 'lucide-react'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode]         = useState('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm]         = useState({ email: '', password: '', full_name: '', phone: '' })

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const validate = () => {
    if (!form.email || !form.password) return 'Email dan password wajib diisi'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Format email tidak valid'
    if (form.password.length < 8) return 'Password minimal 8 karakter'
    if (mode === 'register' && !form.full_name) return 'Nama lengkap wajib diisi'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError(''); setSuccess('')

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })
        if (error) throw error
        // Kirim session ke App.jsx agar langsung load profile
        onSuccess(data.session)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name, phone: form.phone, role: 'tenant' } }
        })
        if (error) throw error
        // Kalau email confirm OFF → langsung dapat session
        if (data.session) {
          onSuccess(data.session)
        } else {
          setSuccess('Akun berhasil dibuat! Silakan login.')
          setTimeout(() => { setMode('login'); setSuccess('') }, 2500)
        }
      }
    } catch (err) {
      if (err.message.includes('Invalid login')) setError('Email atau password salah')
      else if (err.message.includes('already registered')) setError('Email sudah terdaftar')
      else if (err.message.includes('Database error')) setError('Gagal simpan ke database. Pastikan SCHEMA.sql sudah dijalankan di Supabase.')
      else setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        <button onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-10">
          <X size={15} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <span className="text-black font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>K</span>
            </div>
            <span className="text-white font-semibold text-lg" style={{ fontFamily: 'Georgia, serif' }}>Kostify</span>
          </div>

          <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/8 mb-7">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'
                }`}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {mode === 'login' ? 'Selamat Datang' : 'Buat Akun Baru'}
          </h2>
          <p className="text-white/30 text-sm mb-6">
            {mode === 'login' ? 'Masuk untuk lihat kamar & QR akses Anda' : 'Daftar gratis sebagai penyewa'}
          </p>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                <p className="text-emerald-300 text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <InputField icon={User} label="Nama Lengkap" name="full_name" placeholder="Budi Santoso" value={form.full_name} onChange={handleChange} />
            )}
            <InputField icon={Mail} label="Email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
            {mode === 'register' && (
              <InputField icon={Phone} label="No. WhatsApp (opsional)" name="phone" placeholder="08123456789" value={form.phone} onChange={handleChange} />
            )}

            <div>
              <label className="block text-sm font-medium text-white/40 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password" value={form.password} onChange={handleChange}
                  placeholder="Minimal 8 karakter"
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-amber-400/40 transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-1">
              {loading
                ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Memproses...</>
                : <>{mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Gratis'} <ArrowRight size={15} /></>
              }
            </motion.button>
          </form>

          <p className="text-center text-white/20 text-xs mt-5">
            {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
              {mode === 'login' ? 'Daftar Sekarang' : 'Masuk'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InputField({ icon: Icon, label, name, type = 'text', placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/40 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-amber-400/40 transition-all text-sm" />
      </div>
    </div>
  )
}