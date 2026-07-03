with seeded_users as (
  insert into public.app_users (name, email, password_hash, role, lat, lng, review_count, rating_average)
  values
    ('Admin', 'admin@local.test', crypt('admin12345', gen_salt('bf')), 'admin', 23.7465, 90.3760, 0, 0),
    ('Seller 1', 'seller1@local.test', crypt('password123', gen_salt('bf')), 'user', 23.7505, 90.3840, 2, 4.3),
    ('Seller 2', 'seller2@local.test', crypt('password123', gen_salt('bf')), 'user', 23.7937, 90.4066, 3, 4.5),
    ('Seller 3', 'seller3@local.test', crypt('password123', gen_salt('bf')), 'user', 23.8103, 90.3654, 1, 4.1),
    ('Seller 4', 'seller4@local.test', crypt('password123', gen_salt('bf')), 'user', 23.7925, 90.4078, 4, 4.7),
    ('Seller 5', 'seller5@local.test', crypt('password123', gen_salt('bf')), 'user', 23.7639, 90.3588, 2, 4.2)
  on conflict (email) do update set
    name = excluded.name,
    role = excluded.role,
    lat = excluded.lat,
    lng = excluded.lng,
    review_count = excluded.review_count,
    rating_average = excluded.rating_average
  returning id, email
),
all_users as (
  select id, email from seeded_users
  union
  select id, email from public.app_users where email in (
    'admin@local.test',
    'seller1@local.test',
    'seller2@local.test',
    'seller3@local.test',
    'seller4@local.test',
    'seller5@local.test'
  )
),
cleared_seed_listings as (
  delete from public.listings
  where title in (
    'iPhone 13 128GB',
    'Samsung Galaxy S22',
    'Dell XPS 13',
    'Study Table',
    'Canon EOS 700D',
    'iPhone 13 urgent sale'
  )
  returning id
),
seeded_listings as (
  insert into public.listings (
    seller_id, title, category, brand, condition, price, description, lat, lng,
    status, fraud_score, fraud_decision, fraud_signals, fraud_explanations
  )
  values
    ((select id from all_users where email = 'seller1@local.test'), 'iPhone 13 128GB', 'phone', 'Apple', 'excellent', 52000, 'Clean phone, Face ID ok, battery 88%.', 23.7505, 90.3840, 'available', 0, 'allow', '{}', '{}'),
    ((select id from all_users where email = 'seller2@local.test'), 'Samsung Galaxy S22', 'phone', 'Samsung', 'good', 42000, 'Box included, minor scratches.', 23.7937, 90.4066, 'available', 0, 'allow', '{}', '{}'),
    ((select id from all_users where email = 'seller4@local.test'), 'Dell XPS 13', 'laptop', 'Dell', 'excellent', 74000, 'Core i7, 16GB RAM, urgent sell.', 23.7925, 90.4078, 'available', 0, 'allow', '{}', '{}'),
    ((select id from all_users where email = 'seller5@local.test'), 'Study Table', 'furniture', 'Regal', 'good', 4500, 'Solid wood table for student room.', 23.7639, 90.3588, 'available', 0, 'allow', '{}', '{}'),
    ((select id from all_users where email = 'seller3@local.test'), 'Canon EOS 700D', 'camera', 'Canon', 'fair', 28000, 'Lens included, works fine.', 23.8103, 90.3654, 'available', 0, 'allow', '{}', '{}'),
    ((select id from all_users where email = 'seller1@local.test'), 'iPhone 13 urgent sale', 'phone', 'Apple', 'excellent', 12000, 'iPhone 13 urgent sale inbox fast', 23.7505, 90.3840, 'available', 84, 'review', array['price_anomaly','urgent_language'], array['Demo suspicious listing'])
  returning id, title
)
insert into public.listing_photos (listing_id, url, hash, storage)
select id, '/uploads/' || lower(replace(title, ' ', '-')) || '.jpg',
  case when title = 'iPhone 13 urgent sale' then 'ff00ff00ff00ff00' else substr(md5(title), 1, 16) end,
  'local'
from seeded_listings;
