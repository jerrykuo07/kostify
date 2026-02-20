# 🏠 KOSTIFY — Panduan Setup & Testing Lengkap

---

## 📋 DAFTAR ISI
1. [Persiapan Awal](#1-persiapan-awal)
2. [Setup Supabase (Database)](#2-setup-supabase)
3. [Setup Project di Komputer](#3-setup-project)
4. [Setup Midtrans (Payment)](#4-setup-midtrans)
5. [Deploy Edge Functions](#5-deploy-edge-functions)
6. [Cara Testing Semua Fitur](#6-testing)
7. [Simulasi HP sebagai Scanner QR](#7-scanner-qr-di-hp)
8. [Deploy Online (Vercel)](#8-deploy-vercel)

---

## 1. PERSIAPAN AWAL

### Install Node.js
- Buka https://nodejs.org → download versi **LTS**
- Install sampai selesai
- Verifikasi: buka **Command Prompt**, ketik `node --version`

### Ekstrak Project
- Klik kanan `kostify-final.zip` → **Extract All**
- Pilih folder yang mudah diakses, misal `C:\Projects\`

### Buka di VS Code
- Buka VS Code → **File → Open Folder** → pilih folder `kostify-final`

---

## 2. SETUP SUPABASE

### 2A. Buat Project
1. Buka https://supabase.com → **Sign Up / Login** (gratis)
2. Klik **New Project**
   - Name: `kostify`
   - Database Password: buat password kuat, **simpan di tempat aman!**
   - Region: **Southeast Asia (Singapore)**
3. Tunggu ±2 menit sampai status **"Project is ready"**

### 2B. Jalankan SQL Schema
1. Di sidebar Supabase → klik **SQL Editor**
2. Klik **New Query** (tombol `+`)
3. Buka file `SCHEMA.sql` dari folder project
4. **Copy semua isinya** → paste di SQL Editor
5. Klik tombol **Run** (atau tekan Ctrl+Enter)
6. Pastikan muncul pesan: **"Success. No rows returned"**

> ✅ Ini akan membuat semua tabel: profiles, rooms, booking_requests, rentals, payments, access_logs

### 2C. Konfigurasi Authentication
1. Supabase → **Authentication** (ikon gembok di sidebar)
2. Klik **Providers** → **Email**
3. Toggle **"Confirm email"** → **OFF** (untuk testing tanpa verifikasi email)
4. Klik **Save**

### 2D. Set URL Redirect
1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** → isi: `http://localhost:5173`
3. **Redirect URLs** → klik **Add URL** → isi: `http://localhost:5173`
4. Klik **Save**

### 2E. Ambil API Keys
1. Supabase → **Settings** (ikon roda gigi) → **API**
2. Catat dua nilai ini:
   - **Project URL** → contoh: `https://abcxyzabc.supabase.co`
   - **anon public** key → string panjang dimulai `eyJ...`
3. Juga catat **service_role** key (akan dibutuhkan untuk Edge Functions)

---

## 3. SETUP PROJECT

### 3A. Buat file `.env`
Di VS Code:
1. Klik kanan di area kosong file explorer (panel kiri)
2. **New File** → beri nama `.env` (titik di depan, tanpa ekstensi lain)
3. Isi dengan:

```
VITE_SUPABASE_URL=https://GANTI_URL_SUPABASE_ANDA.supabase.co
VITE_SUPABASE_ANON_KEY=GANTI_ANON_KEY_ANDA

# Midtrans (isi setelah daftar di langkah 4)
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxx
VITE_MIDTRANS_PRODUCTION=false
```

### 3B. Install & Jalankan
Buka **Command Prompt** (bukan PowerShell):
```cmd
cd C:\Projects\kostify-final
npm install
npm run dev
```

Buka browser → **http://localhost:5173**

> 🎉 Landing page gelap & premium harusnya sudah tampil!

### 3C. Buat Akun Admin
1. Di browser, klik **"Masuk / Daftar"** → tab **Daftar**
2. Isi nama, email, password → **Buat Akun Gratis**
3. Login dengan akun tersebut

Sekarang set sebagai admin di Supabase:
1. Supabase → **Table Editor** → tabel **profiles**
2. Cari baris dengan nama Anda → klik ikon **Edit** (pensil)
3. Ubah kolom `role` dari `tenant` → `admin`
4. Klik **Save**
5. Kembali ke browser → **refresh halaman** → login ulang

> ✅ Sekarang navbar menampilkan "Admin Panel" dan Anda punya akses penuh

---

## 4. SETUP MIDTRANS (Payment Gateway)

### 4A. Daftar Akun Midtrans
1. Buka https://midtrans.com → **Daftar / Register**
2. Isi form pendaftaran (nama perusahaan boleh pakai nama pribadi)
3. Verifikasi email
4. Login ke Dashboard Midtrans

### 4B. Ambil API Keys (Mode Sandbox/Testing)
1. Di Dashboard Midtrans, pastikan mode **Sandbox** aktif
   (ada toggle di bagian atas: **Production | Sandbox** → pilih **Sandbox**)
2. Klik **Settings** → **Access Keys**
3. Catat:
   - **Client Key** → contoh: `SB-Mid-client-xxxxxxxxxxxxx`
   - **Server Key** → contoh: `SB-Mid-server-xxxxxxxxxxxxx`

### 4C. Update file `.env`
Buka file `.env`, ganti `VITE_MIDTRANS_CLIENT_KEY`:
```
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
```

### 4D. Aktifkan Snap di index.html
Buka file `index.html`, cari baris yang ada komentar Midtrans:
```html
<!-- Uncomment baris ini setelah dapat Midtrans Client Key -->
<!-- <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="SB-Mid-client-xxx"></script> -->
```

**Hapus komentar** (`<!--` dan `-->`) dan ganti Client Key:
```html
<script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="SB-Mid-client-XXXXX_KEY_ANDA"></script>
```

---

## 5. DEPLOY EDGE FUNCTIONS

Edge Functions adalah "backend" yang berjalan di Supabase untuk:
- `create-payment` → membuat transaksi Midtrans
- `validate-access` → validasi token QR
- `midtrans-webhook` → menerima notifikasi pembayaran

### 5A. Install Supabase CLI
Buka Command Prompt:
```cmd
npm install -g supabase
supabase --version
```

### 5B. Login & Link Project
```cmd
supabase login
```
(Browser akan terbuka → authorize)

```cmd
cd C:\Projects\kostify-final
supabase link --project-ref GANTI_PROJECT_REF_ANDA
```

> Project ref ada di URL Supabase: `https://supabase.com/dashboard/project/PROJECT_REF_DI_SINI`

### 5C. Set Secret Keys
```cmd
supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXX_KEY_ANDA
supabase secrets set MIDTRANS_PRODUCTION=false
supabase secrets set APP_URL=http://localhost:5173
```

> Service role key Supabase sudah otomatis tersedia di Edge Functions, tidak perlu di-set manual.

### 5D. Deploy Functions
```cmd
supabase functions deploy create-payment
supabase functions deploy validate-access
supabase functions deploy midtrans-webhook
```

### 5E. Daftarkan Webhook URL di Midtrans
1. Midtrans Dashboard → **Settings** → **Configuration**
2. **Payment Notification URL** → isi:
   ```
   https://GANTI_PROJECT_REF.supabase.co/functions/v1/midtrans-webhook
   ```
3. Klik **Save**

---

## 6. TESTING SEMUA FITUR

### ✅ FITUR 1: Landing Page
**Cara test:**
- Buka http://localhost:5173 tanpa login
- Pastikan: hero slideshow berjalan (5 detik per foto), scroll animasi halus, semua section tampil (Kamar, Fasilitas, Testimoni, Lokasi)

---

### ✅ FITUR 2: Register & Login
**Cara test:**
1. Klik **"Masuk / Daftar"**
2. Tab **Daftar** → isi semua field → klik **Buat Akun**
3. Berhasil → otomatis pindah ke Dashboard
4. Klik **Keluar** → klik **"Masuk / Daftar"** lagi
5. Tab **Masuk** → isi email + password → Login

**Yang diuji:** Email validation, password min 8 karakter, error message, redirect setelah login

---

### ✅ FITUR 3: Booking Kamar (sebagai Penyewa)
**Cara test:**
1. Login sebagai penyewa (bukan admin)
2. Di Dashboard → klik **"Pesan Kamar Sekarang"** (atau tab Pemesanan)
3. **Langkah 1** → pilih salah satu kamar yang tersedia
4. **Langkah 2** → isi semua field:
   - Nama lengkap
   - No. HP: `08123456789`
   - No. KTP: `3201010101010001` (harus 16 digit)
   - Pekerjaan (opsional)
   - Tanggal masuk: pilih besok
   - Durasi: 1 bulan
5. Klik **Kirim Permintaan Sewa**
6. Muncul halaman sukses ✅

---

### ✅ FITUR 4: Admin Approve Booking
**Cara test:**
1. Buka tab browser baru → login sebagai **admin**
2. Klik **Admin Panel** → tab **Pemesanan**
3. Lihat booking dengan status **"Menunggu"** dari penyewa tadi
4. Klik **Setujui** → isi catatan: "Silakan lakukan pembayaran"
5. Klik **Setujui & Aktifkan**

Sekarang kembali ke browser penyewa → refresh → lihat banner hijau: **"Disetujui! Silakan bayar"**

---

### ✅ FITUR 5: Tambah & Edit Kamar (Admin)
**Cara test:**
1. Login sebagai admin → **Admin Panel** → tab **Kamar**
2. Klik **"Tambah Kamar"**
3. Isi:
   - Nomor: `401`
   - Lantai: `4`
   - Tipe: `suite`
   - Harga: `2500000`
   - Centang beberapa fasilitas
4. Klik **Tambah Kamar** → kamar muncul di grid
5. Hover kamar → klik ikon pensil → edit harga → **Simpan Perubahan**
6. Hover kamar yang kosong → klik ikon palu (maintenance) → status berubah
7. Kembali ke available → klik ikon tempat sampah → konfirmasi hapus

---

### ✅ FITUR 6: Pembayaran via Midtrans
**Cara test:** (pastikan Edge Functions sudah di-deploy dan Client Key di index.html)
1. Login sebagai penyewa yang bookingnya sudah approved
2. Klik **"Bayar Sekarang"** dari banner atau tab Pemesanan
3. Modal pembayaran terbuka → pilih jumlah bulan
4. Klik **Bayar**
5. Popup Midtrans Snap muncul ✅

**Kartu Kredit Test (Sandbox):**
| Field    | Value                |
|----------|----------------------|
| No. Kartu | `4811 1111 1111 1114` |
| CVV      | `123`                |
| Exp      | `01/26`              |
| OTP      | `112233`             |

**QRIS/GoPay Test:** Klik → otomatis success di Sandbox

Setelah bayar sukses → cek tab **Riwayat** → status **"Lunas"**

---

### ✅ FITUR 7: QR Code Generator
**Cara test:**
1. Login sebagai penyewa yang sudah punya rental aktif
2. Tab **QR Akses**
3. QR Code muncul dengan corner decoration emas ✅
4. Terlihat info: Nama kamar, berlaku hingga
5. **Screenshot atau foto** QR ini untuk test Scanner

---

### ✅ FITUR 8: QR Scanner (di HP/Browser)
**Cara test di laptop:**
1. Login sebagai admin → klik avatar → **Scanner QR**
2. Klik **Mulai Scanning** → allow camera permission
3. Arahkan kamera ke QR Code (dari tab penyewa di HP atau foto QR)
4. Hasilnya: hijau ✅ **AKSES DIBERIKAN** atau merah ❌ **AKSES DITOLAK**

---

## 7. SCANNER QR DI HP (Pakai HP Bekas)

Ini cara menggunakan HP bekas sebagai perangkat scanner pintu:

### Opsi A: HP Scan, Web Buka di HP (Recommended)
1. Pastikan HP bekas dan laptop di **WiFi yang sama**
2. Jalankan dev server dengan expose:
   ```cmd
   npm run dev -- --host
   ```
3. Terminal akan tampilkan IP: `Network: http://192.168.1.xxx:5173`
4. Di HP bekas, buka browser → ketik IP tersebut
5. Login sebagai admin → tap avatar → **Scanner QR**
6. HP sekarang bisa scan QR Code penyewa ✅

### Opsi B: Scan QR dari HP Penyewa
1. Penyewa login di HPnya sendiri → buka Dashboard → tab **QR Akses**
2. Admin (dengan HP bekas / laptop) buka Scanner
3. Arahkan kamera scanner ke layar HP penyewa
4. Hasil scan langsung muncul

### Opsi C: Print QR Code
1. Penyewa screenshot QR dari Dashboard
2. Print → tempel di pintu kamar
3. Admin scan dengan HP bekas kapan pun

### Tips Setup HP Bekas sebagai Scanner Permanen:
- Tempel HP di samping pintu dengan holder/bracket
- Buka browser di HP → set bookmark ke halaman Scanner
- Set screen always-on: Settings → Display → Screen Timeout → Never
- Colok charger permanen agar tidak kehabisan baterai

---

## 8. DEPLOY ONLINE (VERCEL)

### 8A. Upload ke GitHub
```cmd
cd C:\Projects\kostify-final
git init
git add .
git commit -m "Initial commit"
```

Buka https://github.com → **New Repository** → nama: `kostify` → Create

```cmd
git remote add origin https://github.com/USERNAME_ANDA/kostify.git
git branch -M main
git push -u origin main
```

### 8B. Deploy di Vercel
1. Buka https://vercel.com → login dengan GitHub
2. **Add New Project** → pilih repo `kostify`
3. Di **Environment Variables**, tambahkan:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | URL Supabase Anda |
| `VITE_SUPABASE_ANON_KEY` | Anon Key Supabase Anda |
| `VITE_MIDTRANS_CLIENT_KEY` | SB-Mid-client-xxx |
| `VITE_MIDTRANS_PRODUCTION` | false |

4. Klik **Deploy** → tunggu 1-2 menit
5. Dapat URL: `https://kostify-xxx.vercel.app` ✅

### 8C. Update Supabase Setelah Deploy
1. Supabase → Authentication → URL Configuration
   - Site URL: `https://kostify-xxx.vercel.app`
   - Redirect URLs: tambah URL Vercel
2. Update secret di Supabase CLI:
   ```cmd
   supabase secrets set APP_URL=https://kostify-xxx.vercel.app
   ```
3. Update `index.html` — ganti URL Midtrans Snap ke production jika perlu

---

## 🗂️ STRUKTUR FILE

```
kostify-final/
├── SCHEMA.sql                          ← Jalankan sekali di Supabase
├── .env.example                        ← Template, salin jadi .env
├── index.html                          ← Aktifkan script Midtrans di sini
├── src/
│   ├── App.jsx                         ← Router utama (home/dashboard/admin/scanner)
│   ├── main.jsx                        ← Entry point
│   ├── index.css                       ← Tailwind base styles
│   ├── lib/
│   │   └── supabase.js                 ← Supabase client & helpers
│   ├── components/
│   │   ├── AuthModal.jsx               ← Popup login/register
│   │   └── BookingModal.jsx            ← Form 2-langkah pesan kamar
│   └── pages/
│       ├── LandingPage.jsx             ← Halaman utama (publik)
│       ├── TenantDashboard.jsx         ← Dashboard penyewa
│       ├── AdminDashboard.jsx          ← Panel admin
│       └── ScannerPage.jsx             ← QR scanner (pakai kamera)
└── supabase/
    └── functions/
        ├── create-payment/             ← Buat transaksi Midtrans
        ├── validate-access/            ← Validasi token QR
        └── midtrans-webhook/           ← Notifikasi pembayaran lunas
```

---

## ❗ TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| Halaman putih/tidak ada style | Jalankan `npm install` ulang, pastikan ada `tailwind.config.js` |
| "Supabase env variables belum diisi" | Pastikan file `.env` ada dan berisi URL + Key yang benar |
| Login gagal terus | Pastikan "Confirm email" di-OFF di Supabase Auth settings |
| Midtrans popup tidak muncul | Aktifkan script di `index.html`, isi Client Key di `.env` |
| QR Scanner tidak bisa akses kamera | Buka via HTTPS (Vercel) atau localhost — kamera tidak bisa di HTTP biasa |
| "Failed to fetch" saat bayar | Edge Functions belum di-deploy atau secrets belum di-set |
| Booking tidak muncul di Admin | Pastikan SQL schema sudah dijalankan lengkap (tabel `booking_requests`) |

---

*Dibuat dengan ❤️ — Kostify v1.0*
