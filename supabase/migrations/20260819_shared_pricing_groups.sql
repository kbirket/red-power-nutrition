-- Shared pricing groups: drinks reference a reusable pricing structure.
create table if not exists public.pricing_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_options (
  id uuid primary key default gen_random_uuid(),
  pricing_group_id uuid not null references public.pricing_groups(id) on delete cascade,
  level text not null,
  size text,
  price numeric(10,2) not null check(price >= 0),
  is_available boolean not null default true,
  sort_order int not null default 0,
  unique(pricing_group_id, level, size)
);

alter table public.menu_items add column if not exists pricing_group_id uuid references public.pricing_groups(id) on delete set null;

insert into public.pricing_groups(name) values ('Tea Levels'), ('Shake Prices')
on conflict (name) do nothing;

-- Give existing tea and shake items the shared group.
update public.menu_items mi
set pricing_group_id = pg.id
from public.pricing_groups pg, public.menu_categories mc
where mi.category_id = mc.id
  and ((mc.name = 'Loaded Teas' and pg.name = 'Tea Levels')
    or (mc.name = 'Protein Shakes' and pg.name = 'Shake Prices'));

-- Preserve existing owner-entered options by copying distinct options into the shared groups.
insert into public.pricing_options(pricing_group_id, level, size, price, is_available, sort_order)
select pg.id,
       case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name, ' - ', 1)) else mo.name end,
       case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name, ' - ', 2)) else null end,
       min(mo.price), bool_or(coalesce(mo.is_available, true)), 0
from public.menu_item_options mo
join public.menu_items mi on mi.id = mo.menu_item_id
join public.menu_categories mc on mc.id = mi.category_id
join public.pricing_groups pg on ((mc.name = 'Loaded Teas' and pg.name = 'Tea Levels') or (mc.name = 'Protein Shakes' and pg.name = 'Shake Prices'))
group by pg.id,
         case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name, ' - ', 1)) else mo.name end,
         case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name, ' - ', 2)) else null end
on conflict (pricing_group_id, level, size) do nothing;
