create table if not exists public.menu_item_flavors (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  is_available boolean not null default true,
  sort_order int not null default 0
);

alter table public.menu_item_flavors enable row level security;

create policy "Allow public menu item flavor reads"
on public.menu_item_flavors for select
to anon, authenticated
using (true);

create policy "Allow public menu item flavor inserts"
on public.menu_item_flavors for insert
to anon, authenticated
with check (true);

create policy "Allow public menu item flavor updates"
on public.menu_item_flavors for update
to anon, authenticated
using (true)
with check (true);

create policy "Allow public menu item flavor deletes"
on public.menu_item_flavors for delete
to anon, authenticated
using (true);