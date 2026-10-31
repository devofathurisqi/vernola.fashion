-- Disposable local PostgreSQL only. Run after V2 + 007 + 008.
\set ON_ERROR_STOP on
begin;
set role anon;
do $$declare ctx jsonb;begin
 if(select count(*) from public.catalog_library_products)<>27 then raise exception 'Expected 27 public masters';end if;
 ctx:=public.get_catalog_context('vernola-fashion',false);
 if jsonb_array_length(ctx->'products')<>31 then raise exception 'Public card count incorrect';end if;
 if exists(select 1 from jsonb_array_elements(ctx->'products') p where p?'description' or jsonb_array_length(p->'variants')>5) then raise exception 'Full details leaked into bootstrap';end if;
 begin update public.catalog_library_products set name='Forbidden';raise exception 'Anonymous mutated master';exception when insufficient_privilege then null;end;
 begin perform public.get_catalog_context('vernola-fashion',true);raise exception 'Anonymous entered admin context';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
do $$declare master uuid;listing uuid;again uuid;variant text;resolved jsonb;original int;begin
 select id,variants->0->>'id' into master,variant from public.catalog_library_products where source_key='vuyama:modal-viscose';
 begin update public.catalog_library_products set name='Forbidden' where id=master;raise exception 'Client mutated public master';exception when insufficient_privilege then null;end;
 listing:=public.attach_library_product('20000000-0000-4000-8000-000000000002',master);
 again:=public.attach_library_product('20000000-0000-4000-8000-000000000002',master);
 if listing<>again then raise exception 'Import is not idempotent';end if;
 if(select active from public.products where id=listing) then raise exception 'Import should start as draft';end if;
 if(select variants from public.products where id=listing)<>'[]'::jsonb then raise exception 'Master variants duplicated per store';end if;
 update public.products set price=123456,stock_confirm=false,content_overrides=jsonb_build_object('variant_overrides',jsonb_build_object(variant,jsonb_build_object('stock',11))) where id=listing;
 select variants into resolved from public.catalog_products where id=listing;
 if(resolved->0->>'stock')::int<>11 then raise exception 'Sparse variant stock not resolved';end if;
 if(select variants->0->>'stock' from public.catalog_library_products where id=master)<>'0' then raise exception 'Master stock mutated';end if;
 begin update public.products set library_product_id=null where id=listing;raise exception 'Master reference detached';exception when insufficient_privilege then null;end;
 begin update public.products set content_overrides='{"variant_overrides":{"missing-id":{"stock":2}}}' where id=listing;raise exception 'Unknown variant allowed';exception when raise_exception then if sqlerrm='Unknown variant allowed' then raise;end if;end;
 begin insert into storage.objects(bucket_id,name) values('vuyama-library','v1/forbidden.webp');raise exception 'Client uploaded master image';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
do $$begin
 if exists(select 1 from public.catalog_products where store_id='20000000-0000-4000-8000-000000000002' and library_product_id is not null) then raise exception 'Other tenant draft visible';end if;
 begin perform public.get_catalog_context('other-store',true);raise exception 'Other tenant admin context visible';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
select 'PASS: public read-only masters, compact cards, inherited content, idempotent attach, sparse store stocks, private drafts, master asset write denial' as result;
