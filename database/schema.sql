-- ============================================================
-- SIPADU — Sistem Informasi Pelayanan dan Buku Tamu Terpadu
-- Skema Database (PostgreSQL / Supabase-ready)
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ===========================
-- ENUMS
-- ===========================
do $$ begin
  create type jenis_kelamin as enum ('Laki-laki', 'Perempuan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_program as enum ('PB', 'CB');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kategori_lapor as enum ('anak', 'dewasa');
exception when duplicate_object then null; end $$;

-- ===========================
-- TABLE: laporan (Wajib Lapor — Anak & Dewasa)
-- ===========================
create table if not exists public.laporan (
  id              uuid primary key default gen_random_uuid(),
  kategori        kategori_lapor   not null,
  nama_klien      text             not null,
  tanggal_lahir   date             not null,
  jenis_kelamin   jenis_kelamin    not null,
  alamat          text             not null,
  status_program  status_program   not null,
  pasal           text             not null,
  asal_instansi   text             not null,
  tanggal_lapor   date             not null default current_date,
  tanggal_kembali date             not null,
  pembimbing      text             not null,
  -- Geotagging (wajib lapor saja)
  latitude        double precision,
  longitude       double precision,
  geo_accuracy    double precision,
  geo_captured_at timestamptz,
  created_at      timestamptz      not null default now(),
  updated_at      timestamptz      not null default now()
);

create index if not exists idx_laporan_kategori       on public.laporan(kategori);
create index if not exists idx_laporan_tanggal_lapor  on public.laporan(tanggal_lapor desc);
create index if not exists idx_laporan_tanggal_kembali on public.laporan(tanggal_kembali);
create index if not exists idx_laporan_nama_klien     on public.laporan using gin (to_tsvector('simple', nama_klien));

-- ===========================
-- TABLE: kunjungan (Riwayat Wajib Lapor Harian)
-- ===========================
create table if not exists public.kunjungan (
  id           uuid primary key default gen_random_uuid(),
  laporan_id   uuid not null references public.laporan(id) on delete cascade,
  tanggal      date not null default current_date,
  jam          time not null default current_time,
  petugas      text not null,
  catatan      text,
  created_at   timestamptz not null default now(),
  unique (laporan_id, tanggal)
);

create index if not exists idx_kunjungan_tanggal on public.kunjungan(tanggal desc);
create index if not exists idx_kunjungan_laporan on public.kunjungan(laporan_id);

-- ===========================
-- TABLE: tamu (Buku Tamu)
-- ===========================
create table if not exists public.tamu (
  id             uuid primary key default gen_random_uuid(),
  tanggal        date not null default current_date,
  jam            time not null default current_time,
  nama_tamu      text not null,
  asal_instansi  text not null,
  alamat         text not null,
  keperluan      text not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_tamu_tanggal on public.tamu(tanggal desc);

-- ===========================
-- TRIGGER: auto-update updated_at
-- ===========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_laporan_updated_at on public.laporan;
create trigger trg_laporan_updated_at
  before update on public.laporan
  for each row execute function public.set_updated_at();

-- ===========================
-- RLS (siapkan, sesuaikan policy setelah auth diaktifkan)
-- ===========================
alter table public.laporan    enable row level security;
alter table public.kunjungan  enable row level security;
alter table public.tamu       enable row level security;
