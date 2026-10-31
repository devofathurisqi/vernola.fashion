-- Run once through Supabase SQL Editor, as project owner. No secret key required in frontend.
begin;
create table public.stores(id uuid primary key default gen_random_uuid(),slug text not null unique,name text not null,tagline text not null default '',whatsapp text not null default '' check(whatsapp='' or whatsapp ~ '^62[0-9]{8,13}$'));
create table public.store_members(store_id uuid references public.stores on delete cascade,user_id uuid references auth.users on delete cascade,primary key(store_id,user_id));
create table public.categories(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores on delete cascade,name text not null check(length(trim(name)) between 1 and 80),description text not null default '',position integer not null default 0 check(position>=0),unique(store_id,id),unique(store_id,name));
create function public.valid_variants(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; names text[] := '{}'; ids text[] := '{}';
begin
 if jsonb_typeof(v) <> 'array' then return false; end if;
 for item in select * from jsonb_array_elements(v) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'name')),0)=0 or coalesce(length(item->>'id'),0)=0 or jsonb_typeof(item->'stock') is distinct from 'number' or (item->>'stock') !~ '^[0-9]+$' then return false; end if;
  if lower(trim(item->>'name'))=any(names) or (item->>'id')=any(ids) then return false; end if;
  names:=array_append(names,lower(trim(item->>'name')));ids:=array_append(ids,item->>'id');
 end loop;return true;
end $$;
create table public.products(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores on delete cascade,category_id uuid,name text not null check(length(trim(name)) between 1 and 160),description text not null default '' check(length(description)<=5000),price bigint not null default 0 check(price between 0 and 9007199254740991),price_confirm boolean not null default false,stock integer not null default 0 check(stock>=0),stock_confirm boolean not null default false,images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=8),has_colors boolean not null default false,variants jsonb not null default '[]' check(public.valid_variants(variants)),active boolean not null default false,created_at timestamptz not null default now(),foreign key(store_id,category_id) references public.categories(store_id,id) on delete restrict,check((has_colors and jsonb_array_length(variants)>0) or (not has_colors and variants='[]'::jsonb)));
create index products_store_idx on public.products(store_id,active);
create index categories_store_idx on public.categories(store_id);
create function public.is_store_admin(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.store_members where store_id=target and user_id=(select auth.uid()))$$;
revoke all on function public.is_store_admin(uuid) from public;
grant execute on function public.is_store_admin(uuid) to anon,authenticated;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
revoke all on public.stores,public.store_members,public.categories,public.products from anon,authenticated;
grant select on public.stores,public.categories,public.products to anon;
grant select on public.stores,public.store_members,public.categories,public.products to authenticated;
grant insert,update,delete on public.categories,public.products to authenticated;
grant update(name,tagline,whatsapp) on public.stores to authenticated;
revoke all on public.store_members from anon;
revoke insert,update,delete on public.store_members from authenticated;
create policy stores_public on public.stores for select to anon,authenticated using(true);
create policy stores_admin on public.stores for update to authenticated using(public.is_store_admin(id)) with check(public.is_store_admin(id));
create policy memberships_self on public.store_members for select to authenticated using(user_id=(select auth.uid()));
create policy categories_public on public.categories for select to anon,authenticated using(true);
create policy categories_admin on public.categories for all to authenticated using(public.is_store_admin(store_id)) with check(public.is_store_admin(store_id));
create policy products_public on public.products for select to anon,authenticated using(active or public.is_store_admin(store_id));
create policy products_admin on public.products for all to authenticated using(public.is_store_admin(store_id)) with check(public.is_store_admin(store_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog-images','catalog-images',true,1048576,array['image/webp']);
create policy catalog_image_upload on storage.objects for insert to authenticated with check(bucket_id='catalog-images' and exists(select 1 from public.store_members m where m.user_id=(select auth.uid()) and m.store_id::text=(storage.foldername(name))[1]));
create policy catalog_image_delete on storage.objects for delete to authenticated using(bucket_id='catalog-images' and exists(select 1 from public.store_members m where m.user_id=(select auth.uid()) and m.store_id::text=(storage.foldername(name))[1]));
create policy catalog_image_read on storage.objects for select to authenticated using(bucket_id='catalog-images' and exists(select 1 from public.store_members m where m.user_id=(select auth.uid()) and m.store_id::text=(storage.foldername(name))[1]));
commit;

-- Run after 001_schema.sql. Safe to rerun: existing records are not overwritten.
begin;
insert into public.stores(id,slug,name,tagline,whatsapp) values('00000000-0000-4000-8000-000000000001','vernola-fashion','Vernola.fashion','Everyday Elegance, Everyday Comfort','6281368732131') on conflict do nothing;
insert into public.categories(id,store_id,name,description,position) values('00000000-0000-4000-8001-000000000001','00000000-0000-4000-8000-000000000001','Hijab','Pilihan untuk setiap hari',0) on conflict do nothing;
insert into public.categories(id,store_id,name,description,position) values('00000000-0000-4000-8001-000000000002','00000000-0000-4000-8000-000000000001','Atasan','Detail yang melengkapi gaya',1) on conflict do nothing;
insert into public.products(id,store_id,category_id,name,description,price,price_confirm,stock,stock_confirm,images,has_colors,variants,active) values('00000000-0000-4000-8002-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001','Bergo Kanaya S','Bergo Kanaya ukuran S, sesuai foto koleksi. Silakan konfirmasi bahan, harga, dan ketersediaan kepada admin.',0,true,0,true,'["/assets/product-4.jpg","/assets/product-1.jpg","/assets/product-2.jpg","/assets/product-3.jpg"]'::jsonb,true,'[{"id":"coksu","name":"Coksu–Milo","stock":0,"image":"/assets/product-1.jpg"},{"id":"aurora","name":"Aurora–Nude","stock":0,"image":"/assets/product-2.jpg"},{"id":"pewter","name":"BW–Pewter","stock":0,"image":"/assets/product-3.jpg"}]'::jsonb,true) on conflict do nothing;
insert into public.products(id,store_id,category_id,name,description,price,price_confirm,stock,stock_confirm,images,has_colors,variants,active) values('00000000-0000-4000-8002-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001','Bergo Alana S','Bergo Alana ukuran S. Foto warna berasal dari koleksi yang diberikan. Harga dan ketersediaan dikonfirmasi admin.',0,true,0,true,'["/assets/product-10.jpg","/assets/product-5.jpg","/assets/product-6.jpg","/assets/product-7.jpg"]'::jsonb,true,'[{"id":"misty","name":"Misty","stock":0,"image":"/assets/product-5.jpg"},{"id":"milo","name":"Milo","stock":0,"image":"/assets/product-6.jpg"},{"id":"navy","name":"Navy","stock":0,"image":"/assets/product-7.jpg"}]'::jsonb,true) on conflict do nothing;
insert into public.products(id,store_id,category_id,name,description,price,price_confirm,stock,stock_confirm,images,has_colors,variants,active) values('00000000-0000-4000-8002-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001','Inspirasi Bergo','Contoh tampilan bergo dari foto koleksi. Nama model, bahan, ukuran, harga, dan stok menunggu konfirmasi admin.',0,true,0,true,'["/assets/product-9.jpg","/assets/product-8.jpg"]'::jsonb,false,'[]'::jsonb,true) on conflict do nothing;
insert into public.products(id,store_id,category_id,name,description,price,price_confirm,stock,stock_confirm,images,has_colors,variants,active) values('00000000-0000-4000-8002-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000002','Blouse 512352','Blouse motif polkadot dengan detail renda. Keterangan pada foto: lingkar dada 114 cm, panjang 64 cm, Snowy. Harga dan stok dikonfirmasi admin.',0,true,0,true,'["/assets/product-11.jpg","/assets/product-12.jpg","/assets/product-13.jpg","/assets/product-14.jpg"]'::jsonb,true,'[{"id":"black","name":"Hitam","stock":0,"image":"/assets/product-11.jpg"},{"id":"white","name":"Putih","stock":0,"image":"/assets/product-12.jpg"}]'::jsonb,true) on conflict do nothing;
commit;
