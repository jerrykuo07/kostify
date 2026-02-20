-- ═══════════════════════════════════════════════════════════════
-- KOSTIFY — SQL Migration: Booking Requests
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Tabel booking_requests: menyimpan permintaan sewa dari user
create table if not exists booking_requests (
  id            uuid default gen_random_uuid() primary key,
  tenant_id     uuid references profiles(id) on delete cascade not null,
  room_id       uuid references rooms(id) on delete cascade not null,

  -- Data diri calon penyewa
  full_name     text not null,
  phone         text not null,
  id_number     text not null,         -- No. KTP
  occupation    text,                  -- Pekerjaan
  emergency_contact text,              -- Kontak darurat

  -- Rencana sewa
  check_in_date date not null,
  duration_months int not null default 1,
  message       text,                  -- Pesan tambahan ke admin

  -- Status & admin
  status        text default 'pending',  -- pending | approved | rejected
  admin_notes   text,                    -- Catatan dari admin
  reviewed_at   timestamptz,
  reviewed_by   uuid references profiles(id),

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS Policies
alter table booking_requests enable row level security;

create policy "Tenant can view own requests"
  on booking_requests for select
  using (auth.uid() = tenant_id);

create policy "Tenant can insert own requests"
  on booking_requests for insert
  with check (auth.uid() = tenant_id);

create policy "Admin can manage all requests"
  on booking_requests for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Auto update updated_at
create or replace function update_booking_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger booking_updated_at
  before update on booking_requests
  for each row execute procedure update_booking_updated_at();

-- Ketika booking di-approve, otomatis buat rental
create or replace function handle_booking_approved()
returns trigger as $$
declare
  v_price numeric;
  v_expiry date;
begin
  -- Hanya proses jika status berubah ke 'approved'
  if new.status = 'approved' and old.status != 'approved' then
    -- Ambil harga kamar
    select price_monthly into v_price from rooms where id = new.room_id;

    -- Hitung expiry date
    v_expiry := new.check_in_date + (new.duration_months || ' months')::interval;

    -- Buat rental baru
    insert into rentals (tenant_id, room_id, start_date, expiry_date, monthly_price, status)
    values (new.tenant_id, new.room_id, new.check_in_date, v_expiry, v_price, 'active');

    -- Update status kamar menjadi occupied
    update rooms set status = 'occupied', updated_at = now() where id = new.room_id;

    -- Set reviewed_at
    new.reviewed_at := now();
  end if;

  -- Jika ditolak, pastikan reviewed_at terisi
  if new.status = 'rejected' and old.status != 'rejected' then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_booking_approved
  before update on booking_requests
  for each row execute procedure handle_booking_approved();
