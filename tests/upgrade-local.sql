-- Run only on the disposable database prepared by rls-local.sql + 004/005.
\set ON_ERROR_STOP on
begin;
insert into public.catalog_activity(store_id,entity_id,entity_name,action) values('20000000-0000-4000-8000-000000000002',gen_random_uuid(),'Other tenant private activity','INSERT');
-- Give the test user both memberships, so the immutable ownership trigger is exercised beyond RLS.
insert into public.store_members(store_id,user_id) values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001') on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
do $$declare rev int;nextrev int;n int;begin
 select revision into rev from public.products where id='00000000-0000-4000-8002-000000000001';
 update public.products set name=name where id='00000000-0000-4000-8002-000000000001' and revision=rev returning revision into nextrev;
 if nextrev<>rev+1 then raise exception 'Revision increment failed';end if;
 update public.products set stock=999 where id='00000000-0000-4000-8002-000000000001' and revision=rev;get diagnostics n=row_count;
 if n<>0 then raise exception 'Stale update succeeded';end if;
 begin update public.products set store_id='20000000-0000-4000-8000-000000000002',category_id=null where id='00000000-0000-4000-8002-000000000001';raise exception 'Ownership mutation succeeded';exception when insufficient_privilege then null;end;
 begin update public.stores set slug='hijacked' where id='00000000-0000-4000-8000-000000000001';raise exception 'Slug mutation succeeded';exception when insufficient_privilege then null;end;
 if not exists(select 1 from public.catalog_activity where entity_id='00000000-0000-4000-8002-000000000001' and action='UPDATE') then raise exception 'Audit not created';end if;
end$$;
reset role;
delete from public.store_members where store_id='20000000-0000-4000-8000-000000000002' and user_id='10000000-0000-4000-8000-000000000001';
set role authenticated;
do $$begin if exists(select 1 from public.catalog_activity where store_id='20000000-0000-4000-8000-000000000002') then raise exception 'Other tenant audit exposed';end if;end$$;
reset role;
set role anon;
do $$begin begin perform 1 from public.catalog_activity;raise exception 'Anonymous audit exposed';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
select 'PASS: revision conflict, immutable tenant ownership, immutable store slug, audit generation, audit privacy' as result;
