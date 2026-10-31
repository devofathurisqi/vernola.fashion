import {writeFileSync} from 'node:fs';
import {sample} from '../src/sample.js';
const quote=s=>`'${String(s).replaceAll("'","''")}'`;
const store='00000000-0000-4000-8000-000000000001';
const cats=new Map(sample.categories.map((c,i)=>[c.id,`00000000-0000-4000-8001-${String(i+1).padStart(12,'0')}`]));
const lines=['-- Run after 001_schema.sql. Safe to rerun: existing records are not overwritten.','begin;',`insert into public.stores(id,slug,name,tagline,whatsapp) values('${store}','vernola-fashion','Vernola.fashion',${quote(sample.store.tagline)},'6281368732131') on conflict do nothing;`];
for(const c of sample.categories)lines.push(`insert into public.categories(id,store_id,name,description,position) values('${cats.get(c.id)}','${store}',${quote(c.name)},${quote(c.description)},${c.position}) on conflict do nothing;`);
sample.products.forEach((p,i)=>lines.push(`insert into public.products(id,store_id,category_id,name,description,price,price_confirm,stock,stock_confirm,images,has_colors,variants,active) values('00000000-0000-4000-8002-${String(i+1).padStart(12,'0')}','${store}','${cats.get(p.category_id)}',${quote(p.name)},${quote(p.description)},0,true,0,true,${quote(JSON.stringify(p.images))}::jsonb,${p.has_colors},${quote(JSON.stringify(p.variants))}::jsonb,true) on conflict do nothing;`));
lines.push('commit;');writeFileSync(new URL('./002_vernola_seed.sql',import.meta.url),lines.join('\n')+'\n');
