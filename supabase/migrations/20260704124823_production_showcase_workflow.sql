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

alter table public.conversations enable row level security;
grant all on table public.conversations to service_role;

alter table public.chat_messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

insert into public.conversations (listing_id, buyer_id, seller_id)
select distinct
  cm.listing_id,
  case when cm.sender_id = l.seller_id then cm.recipient_id else cm.sender_id end as buyer_id,
  l.seller_id
from public.chat_messages cm
join public.listings l on l.id = cm.listing_id
where cm.conversation_id is null
  and cm.sender_id <> cm.recipient_id
  and (cm.sender_id = l.seller_id or cm.recipient_id = l.seller_id)
  and (case when cm.sender_id = l.seller_id then cm.recipient_id else cm.sender_id end) <> l.seller_id
on conflict (listing_id, buyer_id, seller_id) do nothing;

update public.chat_messages cm
set conversation_id = c.id
from public.listings l
join public.conversations c on c.listing_id = l.id
where cm.conversation_id is null
  and cm.listing_id = l.id
  and c.seller_id = l.seller_id
  and c.buyer_id = case when cm.sender_id = l.seller_id then cm.recipient_id else cm.sender_id end;

do $$
begin
  if not exists (select 1 from public.chat_messages where conversation_id is null) then
    alter table public.chat_messages alter column conversation_id set not null;
  end if;
end $$;

alter table public.trades
  add column if not exists updated_at timestamptz not null default now();

update public.trades
set status = 'completed'
where status = 'confirmed';

alter table public.trades drop constraint if exists trades_status_check;
alter table public.trades
  add constraint trades_status_check check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'completed'));

alter table public.trades drop constraint if exists trades_listing_id_key;
alter table public.trades drop constraint if exists trades_buyer_seller_check;
alter table public.trades
  add constraint trades_buyer_seller_check check (buyer_id <> seller_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reviews'
      and column_name = 'trade_id'
      and data_type <> 'uuid'
  ) then
    if not exists (
      select 1 from public.reviews
      where trade_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) then
      alter table public.reviews
        alter column trade_id type uuid using trade_id::uuid;
    else
      raise notice 'Skipping reviews.trade_id uuid conversion because legacy non-UUID review rows exist.';
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reviews'
      and column_name = 'trade_id'
      and data_type = 'uuid'
  ) then
    alter table public.reviews drop constraint if exists reviews_trade_id_fkey;
    alter table public.reviews
      add constraint reviews_trade_id_fkey foreign key (trade_id) references public.trades(id) on delete cascade;
  end if;
end $$;

alter table public.reviews drop constraint if exists reviews_reviewer_reviewee_check;
alter table public.reviews
  add constraint reviews_reviewer_reviewee_check check (reviewer_id <> reviewee_id);

create index if not exists conversations_listing_updated_idx on public.conversations (listing_id, updated_at desc);
create index if not exists conversations_buyer_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_idx on public.conversations (seller_id);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages (conversation_id, created_at);
create unique index if not exists trades_one_accepted_sale_idx on public.trades (listing_id) where status in ('accepted', 'completed');
create unique index if not exists trades_listing_buyer_open_idx on public.trades (listing_id, buyer_id) where status in ('requested', 'accepted');
