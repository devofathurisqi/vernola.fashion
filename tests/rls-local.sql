-- Test harness ONLY for a disposable local Postgres cluster, never a hosted project.
\set ON_ERROR_STOP on
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;end$$;
create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,storage to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
\ir ../supabase/001_schema.sql
\ir ../supabase/002_vernola_seed.sql
insert into auth.users values('10000000-0000-4000-8000-000000000001','a@example.test'),('10000000-0000-4000-8000-000000000002','b@example.test');
insert into public.stores(id,slug,name) values('20000000-0000-4000-8000-000000000002','other-store','Other');
insert into public.store_members values('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.products(store_id,name,active) values('20000000-0000-4000-8000-000000000002','Private other-store draft',false);
set role anon;
do $$begin if (select count(*) from public.products)<>4 then raise exception 'Anonymous draft isolation failed';end if;end$$;
reset role;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
do $$declare n int;begin
 update public.products set name='Unauthorized' where store_id='20000000-0000-4000-8000-000000000002';get diagnostics n=row_count;if n<>0 then raise exception 'Cross-store update succeeded';end if;
 begin insert into public.products(store_id,name) values('20000000-0000-4000-8000-000000000002','Forbidden');raise exception 'Cross-store insert succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.store_members values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');raise exception 'Self escalation succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.products(store_id,name,category_id) values('20000000-0000-4000-8000-000000000002','Forbidden category','00000000-0000-4000-8001-000000000001');raise exception 'Cross-store category insert succeeded';exception when insufficient_privilege or foreign_key_violation then null;end;
 insert into public.products(store_id,name) values('00000000-0000-4000-8000-000000000001','Own draft');
 update public.products set stock=5 where store_id='00000000-0000-4000-8000-000000000001' and name='Own draft';get diagnostics n=row_count;if n<>1 then raise exception 'Own update failed';end if;
 begin delete from public.categories where id='00000000-0000-4000-8001-000000000001';raise exception 'Used category deletion succeeded';exception when foreign_key_violation or restrict_violation then null;end;
 insert into storage.objects(bucket_id,name) values('catalog-images','00000000-0000-4000-8000-000000000001/photo.webp');
 begin insert into storage.objects(bucket_id,name) values('catalog-images','20000000-0000-4000-8000-000000000002/photo.webp');raise exception 'Cross-store upload succeeded';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: draft isolation, cross-store writes, membership escalation, category deletion, own CRUD, storage tenant isolation' as result;
