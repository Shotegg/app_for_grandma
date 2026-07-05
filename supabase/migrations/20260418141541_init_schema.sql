create extension if not exists pgcrypto;

create table if not exists contacts (
  id text primary key,
  name text not null,
  avatar_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists contact_channels (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null references contacts(id) on delete cascade,
  channel text not null check (channel in ('messenger','viber')),
  external_id text not null,
  unique(channel, external_id),
  unique(contact_id, channel)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null references contacts(id) on delete cascade,
  direction text not null check (direction in ('incoming','outgoing')),
  text text not null default '',
  audio_path text,
  channel text not null default 'app',
  created_at timestamptz not null default now()
);

create table if not exists read_state (
  contact_id text primary key references contacts(id) on delete cascade,
  last_read_at timestamptz
);
