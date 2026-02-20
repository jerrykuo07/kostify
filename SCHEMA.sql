-- ═══════════════════════════════════════════════════════════════════════════
-- KOSTIFY — SQL Schema Lengkap
-- Jalankan SATU KALI di Supabase SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. PROFILES ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  phone       text,
  role        text default 'tenant',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-buat profile saat user baru daftar
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── 2. ROOMS ─────────────────────────────────────────────────────────────────
create table if not exists rooms (
  id             uuid default gen_random_uuid() primary key,
  room_number    text unique not null,
  floor          text default '1',
  type           text default 'standard',   -- standard | deluxe | suite
  price_monthly  numeric not null default 0,
  status         text default 'available',  -- available | occupied | maintenance
  facilities     text[] default '{}',
  description    text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table rooms enable row level security;

create policy "Everyone can view rooms"
  on rooms for select using (true);
create policy "Admin can manage rooms"
  on rooms for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Data kamar contoh (hapus/edit sesuai kebutuhan)
insert into rooms (room_number, floor, type, price_monthly, status, facilities) values
  ('101', '1', 'standard', 800000,  'available', array['AC','WiFi','Kamar Mandi Dalam']),
  ('102', '1', 'standard', 800000,  'available', array['AC','WiFi','Kamar Mandi Dalam']),
  ('201', '2', 'deluxe',   1200000, 'available', array['AC','WiFi','Kamar Mandi Dalam','Balkon','TV']),
  ('202', '2', 'deluxe',   1200000, 'available', array['AC','WiFi','Kamar Mandi Dalam','Balkon','TV']),
  ('301', '3', 'suite',    2000000, 'available', array['AC','WiFi','Kamar Mandi Dalam','Balkon','TV','Mini Kitchen'])
on conflict (room_number) do nothing;


-- ── 3. RENTALS ───────────────────────────────────────────────────────────────
create table if not exists rentals (
  id              uuid default gen_random_uuid() primary key,
  tenant_id       uuid references profiles(id) on delete cascade,
  room_id         uuid references rooms(id),
  start_date      date not null,
  expiry_date     date not null,
  monthly_price   numeric not null,
  status          text default 'active',   -- active | expired | terminated
  access_token    text unique default encode(gen_random_bytes(32), 'hex'),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table rentals enable row level security;

create policy "Tenant can view own rentals"
  on rentals for select using (auth.uid() = tenant_id);
create policy "Admin can manage rentals"
  on rentals for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ── 4. BOOKING REQUESTS ──────────────────────────────────────────────────────
create table if not exists booking_requests (
  id                uuid default gen_random_uuid() primary key,
  tenant_id         uuid references profiles(id) on delete cascade not null,
  room_id           uuid references rooms(id) on delete cascade not null,

  -- Data diri calon penyewa
  full_name         text not null,
  phone             text not null,
  id_number         text not null,
  occupation        text,
  emergency_contact text,

  -- Rencana sewa
  check_in_date     date not null,
  duration_months   int not null default 1,
  message           text,

  -- Status & review admin
  status            text default 'pending',   -- pending | approved | rejected
  admin_notes       text,
  reviewed_at       timestamptz,
  reviewed_by       uuid references profiles(id),

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table booking_requests enable row level security;

create policy "Tenant can view own requests"
  on booking_requests for select using (auth.uid() = tenant_id);
create policy "Tenant can insert own requests"
  on booking_requests for insert with check (auth.uid() = tenant_id);
create policy "Admin can manage all requests"
  on booking_requests for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at
create or replace function update_booking_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists booking_updated_at on booking_requests;
create trigger booking_updated_at
  before update on booking_requests
  for each row execute procedure update_booking_updated_at();

-- Saat booking di-approve → otomatis buat rental + set room occupied
create or replace function handle_booking_approved()
returns trigger as $$
declare v_price numeric; begin
  if new.status = 'approved' and old.status != 'approved' then
    select price_monthly into v_price from rooms where id = new.room_id;
    insert into rentals (tenant_id, room_id, start_date, expiry_date, monthly_price, status)
    values (
      new.tenant_id, new.room_id, new.check_in_date,
      new.check_in_date + (new.duration_months || ' months')::interval,
      v_price, 'active'
    );
    update rooms set status = 'occupied', updated_at = now() where id = new.room_id;
    new.reviewed_at := now();
  end if;
  if new.status = 'rejected' and old.status != 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_approved on booking_requests;
create trigger on_booking_approved
  before update on booking_requests
  for each row execute procedure handle_booking_approved();


-- ── 5. PAYMENTS ──────────────────────────────────────────────────────────────
create table if not exists payments (
  id                        uuid default gen_random_uuid() primary key,
  rental_id                 uuid references rentals(id),
  tenant_id                 uuid references profiles(id),
  amount                    numeric not null,
  months_paid               int default 1,
  payment_month             date,
  midtrans_order_id         text unique,
  midtrans_snap_token       text,
  midtrans_transaction_id   text,
  midtrans_payment_type     text,
  status                    text default 'pending',  -- pending | paid | failed
  paid_at                   timestamptz,
  created_at                timestamptz default now()
);

alter table payments enable row level security;

create policy "Tenant can view own payments"
  on payments for select using (auth.uid() = tenant_id);
create policy "Tenant can insert own payments"
  on payments for insert with check (auth.uid() = tenant_id);
create policy "Admin can manage payments"
  on payments for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Saat payment lunas → otomatis perpanjang expiry_date rental
create or replace function extend_rental_expiry()
returns trigger as $$
begin
  if new.status = 'paid' and (old.status is null or old.status != 'paid') then
    update rentals set
      expiry_date = (
        case when expiry_date < current_date then current_date else expiry_date end
      ) + (new.months_paid || ' months')::interval,
      status     = 'active',
      updated_at = now()
    where id = new.rental_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_paid on payments;
create trigger on_payment_paid
  before update on payments
  for each row execute procedure extend_rental_expiry();


-- ── 6. ACCESS LOGS ───────────────────────────────────────────────────────────
create table if not exists access_logs (
  id              uuid default gen_random_uuid() primary key,
  rental_id       uuid references rentals(id),
  token_scanned   text,
  access_granted  boolean default false,
  scanner_method  text default 'web',
  notes           text,
  created_at      timestamptz default now()
);

alter table access_logs enable row level security;

create policy "Admin can view logs"
  on access_logs for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
-- Biarkan Edge Function insert log tanpa RLS (pakai service_role)


-- ═══════════════════════════════════════════════════════════════════════════
-- SELESAI! Refresh halaman Supabase Table Editor untuk melihat semua tabel.
-- ═══════════════════════════════════════════════════════════════════════════
