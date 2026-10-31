-- Shared supplier catalog. Apply after V2. Re-runnable; no existing store is deleted.
begin;
create table if not exists public.catalog_library_products(
 id uuid primary key default gen_random_uuid(),
 supplier text not null default 'vuyama',
 source_key text not null unique,
 name text not null check(length(trim(name)) between 1 and 160),
 description text not null default '',
 category_name text not null,
 retail_price bigint check(retail_price between 0 and 9007199254740991),
 images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=8),
 has_colors boolean not null default false,
 variants jsonb not null default '[]' check(public.valid_variants(variants)),
 active boolean not null default true,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 check(not jsonb_path_exists(variants,'$[*] ? (@.stock != 0)')),
 check((has_colors and jsonb_array_length(variants)>0) or (not has_colors and variants='[]'::jsonb))
);
alter table public.catalog_library_products enable row level security;
revoke all on public.catalog_library_products from anon,authenticated;
grant select on public.catalog_library_products to anon,authenticated;
drop policy if exists library_public_read on public.catalog_library_products;
create policy library_public_read on public.catalog_library_products for select to anon,authenticated using(true);

alter table public.products add column if not exists library_product_id uuid references public.catalog_library_products(id) on delete restrict;
alter table public.products add column if not exists content_overrides jsonb not null default '{}' check(jsonb_typeof(content_overrides)='object');
create unique index if not exists products_library_unique on public.products(store_id,library_product_id) where library_product_id is not null;

create or replace function public.resolve_library_variants(base jsonb,patch jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when patch ? 'variants' then patch->'variants' else coalesce((select jsonb_agg(value||coalesce(patch->'variant_overrides'->(value->>'id'),'{}'::jsonb) order by ordinality) from jsonb_array_elements(base) with ordinality),'[]'::jsonb) end
$$;

create or replace function public.validate_library_listing() returns trigger language plpgsql set search_path='' as $$
declare master public.catalog_library_products; item jsonb; resolved jsonb; colors boolean;
begin
 if tg_op='UPDATE' and old.library_product_id is not null and new.library_product_id is distinct from old.library_product_id then raise exception 'Referensi katalog bersama tidak dapat diganti.' using errcode='42501';end if;
 if new.library_product_id is null then
  if new.content_overrides<>'{}'::jsonb then raise exception 'Produk mandiri tidak memakai override master.';end if;return new;
 end if;
 select * into master from public.catalog_library_products where id=new.library_product_id;
 if not found then raise exception 'Produk master tidak ditemukan.';end if;
 if exists(select 1 from jsonb_object_keys(new.content_overrides) k where k not in('name','description','images','has_colors','variants','variant_overrides')) then raise exception 'Field override tidak diizinkan.';end if;
 if new.content_overrides ? 'name' and (jsonb_typeof(new.content_overrides->'name')<>'string' or length(trim(new.content_overrides->>'name')) not between 1 and 160) then raise exception 'Nama override tidak valid.';end if;
 if new.content_overrides ? 'description' and (jsonb_typeof(new.content_overrides->'description')<>'string' or length(new.content_overrides->>'description')>5000) then raise exception 'Deskripsi override tidak valid.';end if;
 if new.content_overrides ? 'images' and (jsonb_typeof(new.content_overrides->'images')<>'array' or jsonb_array_length(new.content_overrides->'images')>8) then raise exception 'Galeri override tidak valid.';end if;
 if new.content_overrides ? 'has_colors' and jsonb_typeof(new.content_overrides->'has_colors')<>'boolean' then raise exception 'Pengaturan warna tidak valid.';end if;
 if new.content_overrides ? 'variant_overrides' then
  if jsonb_typeof(new.content_overrides->'variant_overrides')<>'object' then raise exception 'Override varian tidak valid.';end if;
  for item in select value from jsonb_each(new.content_overrides->'variant_overrides') loop
   if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k not in('name','stock','image','hex')) then raise exception 'Field varian tidak diizinkan.';end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(new.content_overrides->'variant_overrides') k where not exists(select 1 from jsonb_array_elements(master.variants) v where v->>'id'=k)) then raise exception 'ID warna tidak ditemukan di master.';end if;
 end if;
 resolved:=public.resolve_library_variants(master.variants,new.content_overrides);
 colors:=coalesce((new.content_overrides->>'has_colors')::boolean,master.has_colors);
 if not public.valid_variants(resolved) or (colors and jsonb_array_length(resolved)=0) or (not colors and resolved<>'[]'::jsonb) then raise exception 'Nama, stok, atau pilihan warna tidak valid.';end if;
 -- Retain a short title for audit/backwards compatibility; full content remains in master.
 new.name:=coalesce(new.content_overrides->>'name',master.name);
 new.description:='';new.images:='[]'::jsonb;new.has_colors:=false;new.variants:='[]'::jsonb;
 return new;
end$$;
drop trigger if exists products_library_validate on public.products;
create trigger products_library_validate before insert or update on public.products for each row execute function public.validate_library_listing();

create or replace view public.catalog_products with(security_invoker=true) as
select p.id,p.store_id,p.category_id,
 case when p.library_product_id is null then p.name else coalesce(p.content_overrides->>'name',l.name) end as name,
 case when p.library_product_id is null then p.description else coalesce(p.content_overrides->>'description',l.description) end as description,
 p.price,p.price_confirm,p.stock,p.stock_confirm,
 case when p.library_product_id is null then p.images else coalesce(p.content_overrides->'images',l.images) end as images,
 case when p.library_product_id is null then p.has_colors else coalesce((p.content_overrides->>'has_colors')::boolean,l.has_colors) end as has_colors,
 case when p.library_product_id is null then p.variants else public.resolve_library_variants(l.variants,p.content_overrides) end as variants,
 p.active,p.created_at,p.sku,p.featured,p.source_key,p.updated_at,p.revision,p.library_product_id,
 l.revision as library_revision
from public.products p left join public.catalog_library_products l on l.id=p.library_product_id;

create or replace view public.catalog_product_cards with(security_invoker=true) as
select p.id,p.store_id,p.category_id,p.name,p.price,p.price_confirm,p.stock,p.stock_confirm,
 case when jsonb_array_length(p.images)>0 then jsonb_build_array(p.images->0) else '[]'::jsonb end as images,
 p.has_colors,
 coalesce((select jsonb_agg(jsonb_build_object('id',v->>'id','name',v->>'name','hex',v->>'hex')) from(select value v from jsonb_array_elements(p.variants) limit 5) first_colors),'[]'::jsonb) as variants,
 jsonb_array_length(p.variants) as variant_count,
 case when p.has_colors then coalesce((select sum((v->>'stock')::bigint) from jsonb_array_elements(p.variants) v),0) else p.stock end as available_stock,
 lower(p.name||' '||p.sku||' '||p.description||' '||coalesce((select string_agg(v->>'name',' ') from jsonb_array_elements(p.variants) v),'')) as search_text,
 p.active,p.created_at,p.updated_at,p.revision,p.sku,p.featured,p.library_product_id
from public.catalog_products p;

create or replace view public.catalog_library_cards with(security_invoker=true) as
select id,supplier,source_key,name,category_name,retail_price,has_colors,
 case when jsonb_array_length(images)>0 then jsonb_build_array(images->0) else '[]'::jsonb end as images,
 jsonb_array_length(variants) as variant_count,active,revision from public.catalog_library_products;

revoke all on public.catalog_products,public.catalog_product_cards,public.catalog_library_cards from anon,authenticated;
grant select on public.catalog_products,public.catalog_product_cards,public.catalog_library_cards to anon,authenticated;

create or replace function public.get_catalog_context(p_slug text,p_admin boolean default false) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare shop public.stores; result jsonb;
begin
 select * into shop from public.stores where slug=p_slug;
 if not found then raise exception 'Toko tidak ditemukan.';end if;
 if p_admin and not public.is_store_admin(shop.id) then raise exception 'Akses toko tidak tersedia.' using errcode='42501';end if;
 select jsonb_build_object('store',to_jsonb(shop),'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.position,c.name) from public.categories c where c.store_id=shop.id),'[]'::jsonb),'products',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from public.catalog_product_cards p where p.store_id=shop.id and(p_admin or p.active)),'[]'::jsonb)) into result;
 return result;
end$$;
revoke all on function public.get_catalog_context(text,boolean) from public;
grant execute on function public.get_catalog_context(text,boolean) to anon,authenticated;

create or replace function public.attach_library_product(target_store uuid,target_library uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare master public.catalog_library_products; category uuid; listing uuid;
begin
 if not public.is_store_admin(target_store) then raise exception 'Akses toko tidak tersedia.' using errcode='42501';end if;
 select id into listing from public.products where store_id=target_store and library_product_id=target_library;
 if found then return listing;end if;
 select * into master from public.catalog_library_products where id=target_library and active;
 if not found then raise exception 'Koleksi master belum tersedia.';end if;
 select id into category from public.categories where store_id=target_store and lower(trim(name))=lower(trim(master.category_name));
 if category is null then
  insert into public.categories(store_id,name,position) values(target_store,master.category_name,coalesce((select max(position)+1 from public.categories where store_id=target_store),0)) on conflict do nothing returning id into category;
  if category is null then select id into category from public.categories where store_id=target_store and lower(trim(name))=lower(trim(master.category_name));end if;
 end if;
 insert into public.products(store_id,category_id,library_product_id,name,price,price_confirm,stock_confirm,active,source_key)
 values(target_store,category,target_library,master.name,coalesce(master.retail_price,0),master.retail_price is null,true,false,master.source_key) on conflict do nothing returning id into listing;
 if listing is null then select id into listing from public.products where store_id=target_store and library_product_id=target_library;end if;
 if listing is null then raise exception 'Produk dengan kode sumber ini sudah ada. Hubungi pengelola untuk menghubungkannya.';end if;
 return listing;
end$$;
revoke all on function public.attach_library_product(uuid,uuid) from public;
grant execute on function public.attach_library_product(uuid,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('vuyama-library','vuyama-library',true,2097152,array['image/webp']) on conflict(id) do nothing;
-- No client upload/delete policies: only project operators may publish master assets.
notify pgrst,'reload schema';
commit;
