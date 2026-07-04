create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  lat numeric(9,6) not null default 23.746500,
  lng numeric(9,6) not null default 90.376000,
  location geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng::double precision, lat::double precision), 4326)::geography) stored,
  review_count integer not null default 0 check (review_count >= 0),
  rating_average numeric(3,2) not null default 0 check (rating_average >= 0 and rating_average <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.app_users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null,
  brand text not null default '',
  condition text not null check (condition in ('new', 'excellent', 'good', 'fair', 'poor')),
  price numeric(12,2) not null check (price >= 0),
  description text not null check (char_length(description) between 10 and 2000),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  location geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng::double precision, lat::double precision), 4326)::geography) stored,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'removed')),
  fraud_score integer not null default 0 check (fraud_score >= 0 and fraud_score <= 100),
  fraud_decision text not null default 'allow' check (fraud_decision in ('allow', 'review')),
  fraud_signals text[] not null default '{}',
  fraud_explanations text[] not null default '{}',
  fraud_reviewed_by uuid references public.app_users(id) on delete set null,
  fraud_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  hash text,
  storage text not null default 'supabase' check (storage in ('supabase', 'local')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.app_users(id) on delete cascade,
  seller_id uuid not null references public.app_users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  unique (listing_id, buyer_id, seller_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references public.app_users(id) on delete cascade,
  recipient_id uuid not null references public.app_users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.app_users(id) on delete cascade,
  seller_id uuid not null references public.app_users(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'completed')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.app_users(id) on delete cascade,
  reviewee_id uuid not null references public.app_users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 600),
  created_at timestamptz not null default now(),
  unique (trade_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.app_users(id) on delete cascade,
  reason text not null check (reason in ('fraud', 'duplicate', 'prohibited', 'spam', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.ml_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  listing_id uuid references public.listings(id) on delete set null,
  user_id uuid references public.app_users(id) on delete set null,
  actor_id uuid references public.app_users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_predictions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  model_name text not null default 'trust_fraud_classifier',
  model_version text not null,
  score integer not null check (score >= 0 and score <= 100),
  decision text not null check (decision in ('allow', 'review', 'block')),
  threshold_band text not null default 'allow',
  signals text[] not null default '{}',
  explanations text[] not null default '{}',
  feature_snapshot_hash text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_labels (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('admin', 'report', 'manual_csv')),
  source_id text,
  listing_id uuid references public.listings(id) on delete set null,
  actor_id uuid references public.app_users(id) on delete set null,
  label text not null check (label in ('clean', 'fraud', 'duplicate', 'prohibited', 'spam', 'unknown')),
  confidence numeric(4,3) not null default 1 check (confidence >= 0 and confidence <= 1),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ml_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null unique,
  status text not null default 'candidate' check (status in ('candidate', 'active', 'archived', 'rejected')),
  metrics jsonb not null default '{}'::jsonb,
  artifact_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null,
  dataset_version text not null,
  training_rows integer not null default 0 check (training_rows >= 0),
  metrics jsonb not null default '{}'::jsonb,
  promotion_status text not null default 'candidate' check (promotion_status in ('candidate', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists app_users_email_idx on public.app_users (lower(email));
create index if not exists app_users_location_gix on public.app_users using gist (location);
create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_location_gix on public.listings using gist (location);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_category_condition_price_idx on public.listings (category, condition, price);
create index if not exists listings_search_idx on public.listings using gin (to_tsvector('english', title || ' ' || brand || ' ' || description));
create index if not exists listing_photos_listing_id_idx on public.listing_photos (listing_id);
create index if not exists listing_photos_hash_idx on public.listing_photos (hash) where hash is not null;
create index if not exists conversations_listing_updated_idx on public.conversations (listing_id, updated_at desc);
create index if not exists conversations_buyer_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_idx on public.conversations (seller_id);
create index if not exists chat_messages_listing_created_idx on public.chat_messages (listing_id, created_at);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages (conversation_id, created_at);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);
create index if not exists chat_messages_recipient_id_idx on public.chat_messages (recipient_id);
create index if not exists reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index if not exists trades_buyer_id_idx on public.trades (buyer_id);
create index if not exists trades_seller_id_idx on public.trades (seller_id);
create unique index if not exists trades_one_accepted_sale_idx on public.trades (listing_id) where status in ('accepted', 'completed');
create unique index if not exists trades_listing_buyer_open_idx on public.trades (listing_id, buyer_id) where status in ('requested', 'accepted');
create index if not exists reports_listing_id_idx on public.reports (listing_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists ml_events_type_created_idx on public.ml_events (event_type, created_at desc);
create index if not exists ml_events_listing_idx on public.ml_events (listing_id);
create index if not exists ml_predictions_listing_created_idx on public.ml_predictions (listing_id, created_at desc);
create index if not exists ml_predictions_model_version_idx on public.ml_predictions (model_version);
create index if not exists ml_labels_listing_idx on public.ml_labels (listing_id);
create index if not exists ml_labels_source_idx on public.ml_labels (source_type, source_id);
create index if not exists ml_model_versions_status_idx on public.ml_model_versions (model_name, status);
create index if not exists ml_training_runs_model_created_idx on public.ml_training_runs (model_name, created_at desc);

alter table public.app_users enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.trades enable row level security;
alter table public.reports enable row level security;
alter table public.ml_events enable row level security;
alter table public.ml_predictions enable row level security;
alter table public.ml_labels enable row level security;
alter table public.ml_model_versions enable row level security;
alter table public.ml_training_runs enable row level security;

grant all on table public.app_users, public.listings, public.listing_photos, public.conversations, public.chat_messages, public.reviews, public.trades, public.reports, public.ml_events, public.ml_predictions, public.ml_labels, public.ml_model_versions, public.ml_training_runs to service_role;
grant usage, select on sequence public.listing_photos_id_seq to service_role;

create or replace function public.nearby_listings(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 6,
  p_category text default null,
  p_condition text default null,
  p_status text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_query text default null
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  category text,
  brand text,
  condition text,
  price numeric,
  description text,
  lat numeric,
  lng numeric,
  distance_km double precision,
  status text,
  fraud_score integer,
  fraud_decision text,
  fraud_signals text[],
  fraud_explanations text[],
  fraud_reviewed_by uuid,
  fraud_reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  seller_name text,
  seller_rating_average numeric,
  seller_review_count integer,
  photo_urls text[],
  photo_hashes text[]
)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as point
  )
  select
    l.id,
    l.seller_id,
    l.title,
    l.category,
    l.brand,
    l.condition,
    l.price,
    l.description,
    l.lat,
    l.lng,
    round((st_distance(l.location, origin.point) / 1000)::numeric, 2)::double precision as distance_km,
    l.status,
    l.fraud_score,
    l.fraud_decision,
    l.fraud_signals,
    l.fraud_explanations,
    l.fraud_reviewed_by,
    l.fraud_reviewed_at,
    l.created_at,
    l.updated_at,
    u.name as seller_name,
    u.rating_average as seller_rating_average,
    u.review_count as seller_review_count,
    coalesce(array_agg(lp.url order by lp.id) filter (where lp.id is not null), '{}') as photo_urls,
    coalesce(array_agg(lp.hash order by lp.id) filter (where lp.id is not null), '{}') as photo_hashes
  from public.listings l
  join public.app_users u on u.id = l.seller_id
  cross join origin
  left join public.listing_photos lp on lp.listing_id = l.id
  where st_dwithin(l.location, origin.point, p_radius_km * 1000)
    and l.status <> 'removed'
    and (p_category is null or l.category = p_category)
    and (p_condition is null or l.condition = p_condition)
    and (p_status is null or l.status = p_status)
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (
      p_query is null
      or to_tsvector('english', l.title || ' ' || l.brand || ' ' || l.description) @@ plainto_tsquery('english', p_query)
      or l.title ilike '%' || p_query || '%'
    )
  group by l.id, u.id, origin.point
  order by l.location <-> origin.point, l.created_at desc;
$$;

create or replace function public.listing_by_id(p_listing_id uuid)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  category text,
  brand text,
  condition text,
  price numeric,
  description text,
  lat numeric,
  lng numeric,
  status text,
  fraud_score integer,
  fraud_decision text,
  fraud_signals text[],
  fraud_explanations text[],
  fraud_reviewed_by uuid,
  fraud_reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  seller_name text,
  seller_rating_average numeric,
  seller_review_count integer,
  photo_urls text[],
  photo_hashes text[]
)
language sql
stable
set search_path = public
as $$
  select
    l.id, l.seller_id, l.title, l.category, l.brand, l.condition, l.price, l.description,
    l.lat, l.lng, l.status, l.fraud_score, l.fraud_decision, l.fraud_signals, l.fraud_explanations,
    l.fraud_reviewed_by, l.fraud_reviewed_at, l.created_at, l.updated_at,
    u.name, u.rating_average, u.review_count,
    coalesce(array_agg(lp.url order by lp.id) filter (where lp.id is not null), '{}') as photo_urls,
    coalesce(array_agg(lp.hash order by lp.id) filter (where lp.id is not null), '{}') as photo_hashes
  from public.listings l
  join public.app_users u on u.id = l.seller_id
  left join public.listing_photos lp on lp.listing_id = l.id
  where l.id = p_listing_id
  group by l.id, u.id;
$$;

create or replace function public.flagged_listings()
returns table (
  id uuid,
  seller_id uuid,
  title text,
  category text,
  brand text,
  condition text,
  price numeric,
  description text,
  lat numeric,
  lng numeric,
  distance_km double precision,
  status text,
  fraud_score integer,
  fraud_decision text,
  fraud_signals text[],
  fraud_explanations text[],
  fraud_reviewed_by uuid,
  fraud_reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  seller_name text,
  seller_rating_average numeric,
  seller_review_count integer,
  photo_urls text[],
  photo_hashes text[]
)
language sql
stable
set search_path = public
as $$
  select * from public.nearby_listings(23.7465, 90.376, 999, null, null, null, null, null, null)
  where fraud_decision = 'review';
$$;

create or replace function public.admin_marketplace_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'users', (select count(*) from public.app_users),
    'listings', (select count(*) from public.listings),
    'openReports', (select count(*) from public.reports where status = 'open'),
    'flaggedListings', (select count(*) from public.listings where fraud_decision = 'review'),
    'soldListings', (select count(*) from public.listings where status = 'sold')
  );
$$;

grant execute on function public.nearby_listings(double precision, double precision, double precision, text, text, text, numeric, numeric, text) to service_role;
grant execute on function public.listing_by_id(uuid) to service_role;
grant execute on function public.flagged_listings() to service_role;
grant execute on function public.admin_marketplace_stats() to service_role;
