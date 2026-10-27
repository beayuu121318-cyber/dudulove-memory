create schema if not exists memory;

create table if not exists memory.memories (
  id text primary key,
  title text not null,
  content text not null,
  category text not null default 'general',
  layer text not null default 'longterm',
  tags jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  author text,
  mood text,
  importance integer not null default 5 check (importance between 1 and 10),
  v2 jsonb not null default '{}'::jsonb,
  organization_stale boolean not null default false,
  expires_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memories_created_idx on memory.memories (created_at desc);
create index if not exists memories_layer_idx on memory.memories (layer) where is_deleted=false;
create index if not exists memories_owner_idx on memory.memories ((v2->>'ownerLibrary')) where is_deleted=false;
create index if not exists memories_project_idx on memory.memories ((v2->>'projectId')) where is_deleted=false;
create index if not exists memories_v2_gin on memory.memories using gin (v2);

create table if not exists memory.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists memory.chat_materials (
  id text primary key,
  resident_id text not null,
  title text not null,
  source text not null default 'manual',
  raw_content text not null default '',
  messages jsonb not null default '[]'::jsonb,
  event_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_materials_resident_idx on memory.chat_materials (resident_id, created_at desc);

create table if not exists memory.audit_events (
  id bigint generated always as identity primary key,
  kind text not null,
  memory_id text,
  resident_id text,
  event jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists audit_memory_idx on memory.audit_events (memory_id, created_at desc);
create index if not exists audit_resident_idx on memory.audit_events (resident_id, created_at desc);

create table if not exists memory.kv (
  id text primary key,
  value jsonb not null,
  sequence bigint,
  updated_at timestamptz not null default now()
);
create table if not exists memory.sequences (
  name text primary key,
  value bigint not null default 0
);

revoke all on memory.memories, memory.settings, memory.chat_materials,
  memory.audit_events, memory.kv, memory.sequences from public, anon, authenticated;
