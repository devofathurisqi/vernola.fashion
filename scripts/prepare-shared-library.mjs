import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..'),catalog=path.join(root,'catalog');fs.mkdirSync(catalog,{recursive:true});
const baselinePath=path.join(catalog,'vuyama-baseline.json');if(!fs.existsSync(baselinePath))throw Error('The original V2 baseline is required to preserve existing store edits. Restore catalog/vuyama-baseline.json before preparing a migration.');
const original=JSON.parse(fs.readFileSync(baselinePath)),q=s=>`'${String(s).replaceAll("'","''")}'`,uid=s=>{const h=crypto.createHash('sha256').update('shared-library:'+s).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`};
const base='https://qholqpuyumuvsiudhrjk.supabase.co/storage/v1/object/public/vuyama-library/v1/';const toShared=src=>src?.startsWith('/assets/vuyama/')?base+src.slice('/assets/vuyama/'.length):src;
const library=original.products.map(p=>({id:uid(p.source_key),supplier:'vuyama',source_key:p.source_key,name:p.name,description:p.description,category_name:original.categories.find(c=>c.id===p.category_id).name,retail_price:p.price_confirm?null:p.price,images:p.images.map(toShared),has_colors:p.has_colors,variants:p.variants.map(v=>({...v,image:toShared(v.image)})),active:true}));
fs.writeFileSync(path.join(catalog,'library-products.json'),JSON.stringify(library,null,2));
fs.writeFileSync(path.join(root,'src/vuyama.json'),JSON.stringify({...original,products:original.products.map(p=>({...p,library_product_id:library.find(l=>l.source_key===p.source_key).id,images:p.images.map(toShared),variants:p.variants.map(v=>({...v,image:toShared(v.image)}))}))},null,2));
const lines=['-- Seed shared Vuyama master and safely link existing untouched/edited listings.','begin;'];
for(const m of library){const fields=Object.keys(m);lines.push(`insert into public.catalog_library_products(${fields.join(',')}) values(${fields.map(k=>m[k]===null?'null':Array.isArray(m[k])?q(JSON.stringify(m[k]))+'::jsonb':typeof m[k]==='string'?q(m[k]):m[k]).join(',')}) on conflict(source_key) do nothing;`);}
lines.push(`create or replace function pg_temp.shared_image(src text) returns text language sql immutable as $$ select case when src like '/assets/vuyama/%' then ${q(base)}||substr(src,length('/assets/vuyama/')+1) else src end $$;`);
// Compare with the exact previous importer output, preserving edits as explicit local overrides.
for(const old of original.products){const master=library.find(m=>m.source_key===old.source_key);lines.push(`
do $migration$
declare row public.products; patch jsonb; pics jsonb; vars jsonb;
begin
 for row in select * from public.products where source_key=${q(old.source_key)} and library_product_id is null loop
  patch:='{}'::jsonb;
  if row.name<>${q(old.name)} then patch:=patch||jsonb_build_object('name',row.name);end if;
  if row.description<>${q(old.description)} then patch:=patch||jsonb_build_object('description',row.description);end if;
  if row.images<>${q(JSON.stringify(old.images))}::jsonb then
   select coalesce(jsonb_agg(pg_temp.shared_image(value#>>'{}')),'[]'::jsonb) into pics from jsonb_array_elements(row.images);
   patch:=patch||jsonb_build_object('images',pics);
  end if;
  if row.has_colors<>${old.has_colors} then patch:=patch||jsonb_build_object('has_colors',row.has_colors);end if;
  if row.variants<>${q(JSON.stringify(old.variants))}::jsonb then
   select coalesce(jsonb_agg(value||jsonb_build_object('image',pg_temp.shared_image(value->>'image'))),'[]'::jsonb) into vars from jsonb_array_elements(row.variants);
   patch:=patch||jsonb_build_object('variants',vars);
  end if;
  update public.products set library_product_id=${q(master.id)},content_overrides=patch where id=row.id;
 end loop;
end $migration$;`);}
lines.push("notify pgrst,'reload schema';",'commit;');fs.writeFileSync(path.join(root,'supabase/008_seed_shared_vuyama.sql'),lines.join('\n')+'\n');
const uploadDir=path.join(root,'.tools/shared-upload/v1');fs.mkdirSync(uploadDir,{recursive:true});const names=[...new Set(original.products.flatMap(p=>[...p.images,...p.variants.map(v=>v.image)]).filter(Boolean).map(s=>path.basename(s)))];const assets=[];
for(const name of names){const source=path.resolve(root,'../sugarshawl_150_3/public/assets/images',name);for(const size of [360,960]){const file=size===960?name:name.replace('.webp','-360.webp'),destination=path.join(uploadDir,file);if(!fs.existsSync(destination))await sharp(source).rotate().resize({width:size}).webp({quality:size===360?79:84}).toFile(destination);const bytes=fs.readFileSync(destination);assets.push({path:'v1/'+file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}}
fs.writeFileSync(path.join(catalog,'shared-assets.json'),JSON.stringify({bucket:'vuyama-library',version:'v1',files:assets},null,2));
console.log(JSON.stringify({masterProducts:library.length,variants:library.reduce((a,p)=>a+p.variants.length,0),files:assets.length,bytes:assets.reduce((a,f)=>a+f.bytes,0)}));
