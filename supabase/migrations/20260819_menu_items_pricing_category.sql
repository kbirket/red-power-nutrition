-- Let each drink choose the shared pricing category that determines its sizes and prices.
-- Prices remain owned by pricing_categories/pricing_options.

alter table public.menu_items
  add column if not exists pricing_category_id uuid
  references public.pricing_categories(id)
  on delete set null;

create index if not exists menu_items_pricing_category_id_idx
  on public.menu_items(pricing_category_id);
