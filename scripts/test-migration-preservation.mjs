// Generates a local-only SQL regression for edits made before the shared-library migration.
import fs from'node:fs';import path from'node:path';
const p=JSON.parse(fs.readFileSync('catalog/vuyama-baseline.json')).products[0],q=s=>`'${String(s).replaceAll("'","''")}'`;
const row={...p,id:'80000000-0000-4000-8000-000000000001',store_id:'20000000-0000-4000-8000-000000000002',category_id:null,name:'Preserved client title',description:'Preserved client description',price:123456,stock_confirm:false,images:['https://example.test/client-photo.webp'],active:false};row.variants[0].stock=7;
const fields=Object.keys(row),sql=`\\set ON_ERROR_STOP on\ninsert into public.products(${fields.join(',')}) values(${fields.map(k=>row[k]===null?'null':Array.isArray(row[k])?q(JSON.stringify(row[k]))+'::jsonb':typeof row[k]==='string'?q(row[k]):row[k]).join(',')});
\\ir ../../supabase/008_seed_shared_vuyama.sql
do $$declare p public.catalog_products;begin select * into p from public.catalog_products where id='80000000-0000-4000-8000-000000000001';if p.name<>'Preserved client title' or p.description<>'Preserved client description' or p.price<>123456 or p.images->>0<>'https://example.test/client-photo.webp' or (p.variants->0->>'stock')::int<>7 or p.library_product_id is null then raise exception 'Client edits lost during migration';end if;end$$;
delete from public.products where id='80000000-0000-4000-8000-000000000001';
select 'PASS: existing title, description, price, custom photo and color stock survive migration; ID preserved' as result;`;
fs.mkdirSync('.tools/qa',{recursive:true});fs.writeFileSync('.tools/qa/migration-preservation.sql',sql);
