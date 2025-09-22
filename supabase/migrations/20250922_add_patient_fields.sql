-- Add extended patient fields to profiles
alter table if exists public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists dob date,
  add column if not exists gender text,
  add column if not exists allergies text,
  add column if not exists medical_notes text,
  add column if not exists document_id text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

-- Helpful indexes for search
create index if not exists idx_profiles_email_lower on public.profiles (lower(email));
create index if not exists idx_profiles_full_name_lower on public.profiles (lower(full_name));
create index if not exists idx_profiles_phone on public.profiles (phone);


