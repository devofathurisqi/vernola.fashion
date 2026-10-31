-- Additive V2 migration. Run after the successful original setup. Safe to rerun.
begin;
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists source_key text;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists revision integer not null default 1;
alter table public.categories add column if not exists updated_at timestamptz not null default now();
create unique index if not exists products_sku_unique on public.products(store_id,lower(sku)) where sku<>'';
create unique index if not exists products_source_unique on public.products(store_id,source_key) where source_key is not null;
create index if not exists products_store_recent on public.products(store_id,created_at desc,id);
create index if not exists products_store_category on public.products(store_id,category_id,active);
create unique index if not exists categories_name_unique on public.categories(store_id,lower(trim(name)));

create table if not exists public.catalog_activity(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores on delete cascade,
 actor_id uuid references auth.users on delete set null,
 entity_id uuid not null,
 entity_name text not null,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 created_at timestamptz not null default now()
);
create index if not exists catalog_activity_store_recent on public.catalog_activity(store_id,created_at desc);
alter table public.catalog_activity enable row level security;
revoke all on public.catalog_activity from anon,authenticated;
grant select on public.catalog_activity to authenticated;
drop policy if exists activity_admin_read on public.catalog_activity;
create policy activity_admin_read on public.catalog_activity for select to authenticated using(public.is_store_admin(store_id));

create or replace function public.catalog_before_update() returns trigger language plpgsql set search_path='' as $$
begin
 if new.store_id<>old.store_id or new.id<>old.id then raise exception 'Identitas dan toko pemilik tidak dapat diubah.' using errcode='42501';end if;
 new.updated_at:=now();
 if tg_table_name='products' then new.revision:=old.revision+1;new.created_at:=old.created_at;end if;
 return new;
end$$;
drop trigger if exists products_before_update on public.products;
create trigger products_before_update before update on public.products for each row execute function public.catalog_before_update();
drop trigger if exists categories_before_update on public.categories;
create trigger categories_before_update before update on public.categories for each row execute function public.catalog_before_update();

create or replace function public.catalog_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare record_row jsonb;
begin
 record_row:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.catalog_activity(store_id,actor_id,entity_id,entity_name,action) values((record_row->>'store_id')::uuid,auth.uid(),(record_row->>'id')::uuid,record_row->>'name',tg_op);
 return null;
end$$;
revoke all on function public.catalog_audit() from public;
drop trigger if exists products_audit on public.products;
create trigger products_audit after insert or update or delete on public.products for each row execute function public.catalog_audit();
drop trigger if exists categories_audit on public.categories;
create trigger categories_audit after insert or update or delete on public.categories for each row execute function public.catalog_audit();
commit;
