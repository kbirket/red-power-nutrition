-- RED POWER NUTRITION MVP DATABASE
create type public.user_role as enum ('owner','staff','customer');
create type public.order_status as enum ('new','making','ready','completed','cancelled');
create type public.fulfillment_type as enum ('pickup','school_delivery');
create type public.payment_status as enum ('unpaid','cash','venmo','cash_app','card','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check(price >= 0),
  is_seasonal boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  is_available boolean not null default true
);

create table public.school_schedules (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  weekday int not null check(weekday between 0 and 6),
  order_cutoff_time time not null,
  delivery_start_time time not null,
  delivery_end_time time not null,
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text,
  customer_phone text,
  status public.order_status not null default 'new',
  fulfillment public.fulfillment_type not null default 'pickup',
  school_schedule_id uuid references public.school_schedules(id) on delete set null,
  scheduled_for timestamptz,
  payment_status public.payment_status not null default 'unpaid',
  subtotal numeric(10,2) not null default 0,
  fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null default 1 check(quantity > 0)
);

create table public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid references public.addons(id) on delete set null,
  addon_name text not null,
  addon_price numeric(10,2) not null default 0
);

create table public.loyalty_accounts (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  punches int not null default 0 check(punches between 0 and 12),
  free_drinks int not null default 0
);

create table public.loyalty_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  event_type text not null check(event_type in ('punch','redeem','adjustment')),
  punches_delta int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.menu_categories(name, sort_order) values
('Loaded Teas', 1), ('Protein Shakes', 2), ('Seasonal', 3);

insert into public.addons(name, price) values
('Beauty Boost', 1.00), ('Energy Boost', 1.00), ('Protein Boost', 1.50),
('Immunity Boost', 1.00), ('Hydration Boost', 0.75);

insert into public.school_schedules(school_name, weekday, order_cutoff_time, delivery_start_time, delivery_end_time)
values ('Argonia', 5, '08:30', '09:30', '10:00');

-- Analytics view: completed sales by day
create view public.daily_sales as
select date(created_at) as day,
       count(*) filter (where status = 'completed') as completed_orders,
       coalesce(sum(total) filter (where status = 'completed'), 0) as sales
from public.orders
group by date(created_at);
