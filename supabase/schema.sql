-- ============================================================
-- SalonLink — Supabase スキーマ
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- 店舗設定
create table salon_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'COM【コム】',
  chair_count int not null default 3,
  open_time text not null default '10:00',
  close_time text not null default '19:00',
  slot_minutes int not null default 30,
  phone text default '011-XXX-XXXX',
  created_at timestamptz default now()
);
insert into salon_settings (name, chair_count) values ('COM【コム】', 3);

-- スタッフ
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'スタイリスト',
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
insert into staff (name, role, display_order) values
  ('田中 美咲', 'トップスタイリスト', 1),
  ('鈴木 健太', 'スタイリスト', 2),
  ('山本 彩',   'スタイリスト', 3);

-- メニュー
create table menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min int not null,
  price int not null,
  display_order int default 0,
  is_active boolean default true
);
insert into menus (name, duration_min, price, display_order) values
  ('カット',           60,  6000, 1),
  ('カット＋カラー',  90,  12000, 2),
  ('デジタルパーマ', 150, 18000, 3),
  ('トリートメント',  45,  4000, 4);

-- 受付枠の開閉（スタッフ個別）
create table staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  target_date date not null,
  time_slot text not null,   -- 例: "10:00"
  is_open boolean default true,
  unique(staff_id, target_date, time_slot)
);

-- 顧客
create table customers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  name text,
  phone text,
  last_visit date,
  visit_count int default 0,
  created_at timestamptz default now()
);

-- 予約
create table reservations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salon_settings(id),
  staff_id uuid references staff(id),
  customer_id uuid references customers(id),
  menu_id uuid references menus(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed',  -- confirmed / cancelled / completed
  source text not null default 'line',        -- line / phone / walk_in
  salonboard_ref_id text,
  notes text,
  created_at timestamptz default now(),
  -- ダブルブッキング防止: 同スタッフ同時間帯に1件のみ
  constraint no_double_booking
    exclude using gist (
      staff_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    )
    where (status != 'cancelled')
);

-- 決済
create table payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references reservations(id),
  square_transaction_id text,
  amount int not null,
  method text,   -- credit / qr / cash
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- RLS（Row Level Security）
alter table salon_settings   enable row level security;
alter table staff             enable row level security;
alter table menus             enable row level security;
alter table staff_availability enable row level security;
alter table customers         enable row level security;
alter table reservations      enable row level security;
alter table payments          enable row level security;

-- 管理者は全操作可（service_role keyを使う）
-- 公開読み取り: スタッフ・メニュー・空き枠は誰でも読める（Webhook経由）
create policy "public read staff"   on staff   for select using (true);
create policy "public read menus"   on menus   for select using (true);
create policy "public read avail"   on staff_availability for select using (true);
create policy "public read settings" on salon_settings for select using (true);
