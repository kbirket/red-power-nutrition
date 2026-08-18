-- Shared pricing board (independent from individual drink flavors)
create table if not exists public.pricing_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_options (
  id uuid primary key default gen_random_uuid(),
  pricing_category_id uuid not null references public.pricing_categories(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0 check(price >= 0),
  sort_order int not null default 0,
  is_available boolean not null default true
);

-- Reusable monthly, seasonal, holiday, and special-event menus.
create table if not exists public.special_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  menu_type text not null default 'seasonal' check(menu_type in ('monthly','seasonal','holiday','event','special')),
  starts_on date,
  ends_on date,
  repeats_yearly boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.special_menu_items (
  id uuid primary key default gen_random_uuid(),
  special_menu_id uuid not null references public.special_menus(id) on delete cascade,
  name text not null,
  description text,
  menu_category_id uuid references public.menu_categories(id) on delete set null,
  is_available boolean not null default true,
  sort_order int not null default 0
);

create index if not exists pricing_options_category_idx on public.pricing_options(pricing_category_id, sort_order);
create index if not exists special_menu_items_menu_idx on public.special_menu_items(special_menu_id, sort_order);

-- Seed the pricing board from the current Red Power Nutrition menu sheet.
insert into public.pricing_categories (name, sort_order)
select 'Teas', 1 where not exists (select 1 from public.pricing_categories where name = 'Teas');
insert into public.pricing_categories (name, sort_order)
select 'Protein Coffee', 2 where not exists (select 1 from public.pricing_categories where name = 'Protein Coffee');
insert into public.pricing_categories (name, sort_order)
select 'No Caffeine', 3 where not exists (select 1 from public.pricing_categories where name = 'No Caffeine');
insert into public.pricing_categories (name, sort_order)
select 'Shakes', 4 where not exists (select 1 from public.pricing_categories where name = 'Shakes');
insert into public.pricing_categories (name, sort_order)
select 'Combos', 5 where not exists (select 1 from public.pricing_categories where name = 'Combos');
insert into public.pricing_categories (name, sort_order)
select 'Desserts', 6 where not exists (select 1 from public.pricing_categories where name = 'Desserts');

-- Safe public access for the existing anonymous owner portal setup.
alter table public.pricing_categories enable row level security;
alter table public.pricing_options enable row level security;
alter table public.special_menus enable row level security;
alter table public.special_menu_items enable row level security;

drop policy if exists "public pricing categories" on public.pricing_categories;
create policy "public pricing categories" on public.pricing_categories for all using (true) with check (true);
drop policy if exists "public pricing options" on public.pricing_options;
create policy "public pricing options" on public.pricing_options for all using (true) with check (true);
drop policy if exists "public special menus" on public.special_menus;
create policy "public special menus" on public.special_menus for all using (true) with check (true);
drop policy if exists "public special menu items" on public.special_menu_items;
create policy "public special menu items" on public.special_menu_items for all using (true) with check (true);
