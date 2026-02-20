import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Jangan throw — biarkan app tetap render, error akan ditampilkan di UI
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export const isConfigured = !!(supabaseUrl && supabaseAnonKey)

export const getCurrentProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return data
}

export const getDashboardStats = async () => {
  const [rooms, rentals, payments] = await Promise.all([
    supabase.from('rooms').select('status'),
    supabase.from('rentals').select('status, expiry_date'),
    supabase.from('payments').select('amount').eq('status', 'paid'),
  ])
  const totalRooms    = rooms.data?.length ?? 0
  const occupied      = rooms.data?.filter(r => r.status === 'occupied').length ?? 0
  const available     = rooms.data?.filter(r => r.status === 'available').length ?? 0
  const maintenance   = rooms.data?.filter(r => r.status === 'maintenance').length ?? 0
  const activeRentals = rentals.data?.filter(r => r.status === 'active').length ?? 0
  const totalRevenue  = payments.data?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const soon = new Date(); soon.setDate(soon.getDate() + 7)
  const expiringSoon  = rentals.data?.filter(r => {
    const exp = new Date(r.expiry_date)
    return r.status === 'active' && exp <= soon && exp >= new Date()
  }).length ?? 0
  return { totalRooms, occupied, available, maintenance, activeRentals, totalRevenue, expiringSoon }
}

export const validateAccess = async (token, method = 'web') => {
  const res = await fetch(
    `${supabaseUrl}/functions/v1/validate-access`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ token, method }),
    }
  )
  return res.json()
}