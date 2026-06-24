-- Optional Facebook / Instagram on provider profiles (discovery + social proof).
alter table public.users
  add column if not exists facebook_url text,
  add column if not exists instagram_handle text;

comment on column public.users.facebook_url is 'Public Facebook Page or profile URL (https).';
comment on column public.users.instagram_handle is 'Instagram username without @, for display/link only.';
