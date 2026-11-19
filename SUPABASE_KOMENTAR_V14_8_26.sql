-- ============================================================================
-- Moza Studio V14.8.26 - UCAPAN & DOA (komentar) untuk Supabase
-- Jalankan SEKALI di Supabase > SQL Editor (project yang dipakai undangan).
-- Aman dijalankan ulang (idempotent). Tidak menyentuh tabel RSVP / Wedding Space yang ada.
-- Browser tamu memakai publishable/anon key + RLS: tamu hanya bisa MEMBACA komentar berstatus
-- 'approved' dan MENAMBAH komentar baru. Mengubah/menghapus hanya lewat dashboard Supabase-mu.
-- ============================================================================

-- 1) Pengaturan persetujuan (tidak terbaca oleh tamu: RLS aktif tanpa policy)
create table if not exists public.wsp_comment_settings (
  id int primary key default 1 check (id = 1),
  require_approval boolean not null default false
);
insert into public.wsp_comment_settings (id, require_approval) values (1, false)
  on conflict (id) do nothing;
alter table public.wsp_comment_settings enable row level security;
-- Mau komentar disetujui dulu?  ->  update public.wsp_comment_settings set require_approval = true;

-- 2) Tabel komentar
create table if not exists public.wsp_comments (
  id          uuid primary key default gen_random_uuid(),
  client_id   text unique,                      -- ID dari browser (anti-dobel)
  site_key    text not null default '',         -- ID proyek Moza
  channel     text not null default 'Comments', -- "Nama tab / channel" di elemen
  name        text not null,
  message     text not null,
  attendance  text not null default '',
  status      text not null default 'approved', -- approved | pending | hidden
  created_at  timestamptz not null default now(),
  constraint wsp_comments_name_len   check (char_length(btrim(name)) between 1 and 60),
  constraint wsp_comments_msg_len    check (char_length(btrim(message)) between 1 and 1000),
  constraint wsp_comments_att_len    check (char_length(attendance) <= 40),
  constraint wsp_comments_key_len    check (char_length(site_key) <= 120 and char_length(channel) <= 90),
  constraint wsp_comments_status_chk check (status in ('approved','pending','hidden'))
);
create index if not exists wsp_comments_list_idx
  on public.wsp_comments (site_key, channel, status, created_at desc);

-- 3) Trigger: status & waktu SELALU ditentukan server (tamu tidak bisa memaksa 'approved'),
--    teks dirapikan, dan komentar kembar dalam 1 menit ditolak.
create or replace function public.wsp_comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare need boolean;
begin
  select require_approval into need from public.wsp_comment_settings where id = 1;
  new.name       := btrim(new.name);
  new.message    := btrim(new.message);
  new.status     := case when coalesce(need, false) then 'pending' else 'approved' end;
  new.created_at := now();
  if exists (
    select 1 from public.wsp_comments c
    where c.site_key = new.site_key and c.channel = new.channel
      and c.name = new.name and c.message = new.message
      and c.created_at > now() - interval '1 minute'
  ) then
    raise exception 'duplicate comment' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists wsp_comments_bi on public.wsp_comments;
create trigger wsp_comments_bi
  before insert on public.wsp_comments
  for each row execute function public.wsp_comments_before_insert();

-- 4) Keamanan (RLS)
alter table public.wsp_comments enable row level security;

drop policy if exists wsp_comments_read   on public.wsp_comments;
drop policy if exists wsp_comments_insert on public.wsp_comments;
create policy wsp_comments_read   on public.wsp_comments
  for select to anon, authenticated using (status = 'approved');
create policy wsp_comments_insert on public.wsp_comments
  for insert to anon, authenticated with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on public.wsp_comments to anon, authenticated;

-- Moderasi: Supabase > Table Editor > wsp_comments. Ubah kolom status ke 'approved' (tampil),
-- 'pending' (menunggu) atau 'hidden' (disembunyikan), atau hapus barisnya.
