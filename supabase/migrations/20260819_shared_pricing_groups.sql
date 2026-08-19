-- Shared pricing groups. Safe for databases that already have pricing_options.
create table if not exists public.pricing_groups (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table if not exists public.pricing_options (id uuid primary key default gen_random_uuid(), pricing_group_id uuid, level text, size text, price numeric(10,2) not null default 0, is_available boolean not null default true, sort_order int not null default 0);
alter table public.pricing_options add column if not exists pricing_group_id uuid references public.pricing_groups(id) on delete cascade;
alter table public.pricing_options add column if not exists level text;
alter table public.pricing_options add column if not exists size text;
alter table public.menu_items add column if not exists pricing_group_id uuid references public.pricing_groups(id) on delete set null;
insert into public.pricing_groups(name) values ('Tea Levels'),('Shake Prices') on conflict(name) do nothing;
update public.menu_items mi set pricing_group_id=pg.id from public.pricing_groups pg,public.menu_categories mc where mi.category_id=mc.id and ((mc.name='Loaded Teas' and pg.name='Tea Levels') or (mc.name='Protein Shakes' and pg.name='Shake Prices'));
-- If pricing_options was the old flat table, reuse its rows as shared options.
update public.pricing_options set level=case when name ~ '^.*\\s-\\s.*oz$' then trim(split_part(name,' - ',1)) else coalesce(name,'Option') end,size=case when name ~ '^.*\\s-\\s.*oz$' then trim(split_part(name,' - ',2)) else null end where level is null;
-- Assign old flat options by their pricing category names when possible.
update public.pricing_options po set pricing_group_id=pg.id from public.pricing_categories pc join public.pricing_groups pg on lower(pg.name)=lower(pc.name) where po.pricing_category_id=pc.id and po.pricing_group_id is null;
-- Copy legacy per-drink options into Tea Levels / Shake Prices without deleting them.
insert into public.pricing_options(pricing_group_id,level,size,price,is_available,sort_order)
select pg.id,case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',1)) else mo.name end,case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',2)) else null end,min(mo.price),bool_or(coalesce(mo.is_available,true)),0
from public.menu_item_options mo join public.menu_items mi on mi.id=mo.menu_item_id join public.menu_categories mc on mc.id=mi.category_id join public.pricing_groups pg on ((mc.name='Loaded Teas' and pg.name='Tea Levels') or (mc.name='Protein Shakes' and pg.name='Shake Prices'))
where not exists (select 1 from public.pricing_options p where p.pricing_group_id=pg.id and p.level=(case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',1)) else mo.name end) and coalesce(p.size,'')=coalesce(case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',2)) else null end,''))
group by pg.id,case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',1)) else mo.name end,case when mo.name ~ '^.*\\s-\\s.*oz$' then trim(split_part(mo.name,' - ',2)) else null end;
