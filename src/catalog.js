// Public data path: one compact bootstrap, details only when requested, no Auth SDK.
import {brand} from './config';import{cardProduct}from'./library-model';
const base=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let cached,inflight;const details=new Map();
async function request(path,body){const res=await fetch(`${base}/rest/v1/${path}`,{method:body?'POST':'GET',headers:{apikey:key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!res.ok){const e=Error('Koleksi belum dapat dimuat. Periksa koneksi lalu coba kembali.');e.status=res.status;throw e;}return res.json();}
async function read(table,query){return request(table+'?'+new URLSearchParams(query));}
async function legacyContext(){const[store]=await read('stores',{select:'*',slug:'eq.'+brand.slug,limit:'1'});if(!store)throw Error('Toko belum tersedia.');const[categories,products]=await Promise.all([read('categories',{select:'*',store_id:'eq.'+store.id,order:'position.asc,name.asc'}),read('products',{select:'*',store_id:'eq.'+store.id,active:'eq.true',order:'created_at.desc,id.asc',limit:'1000'})]);return{store,categories,products};}
export async function loadCatalog({force=false}={}){
 if(!base||!key)throw Error('Koneksi toko belum tersedia.');if(!force&&cached&&Date.now()-cached.time<30000)return cached.data;if(inflight&&!force)return inflight;
 const task=(async()=>{let data;try{data=await request('rpc/get_catalog_context',{p_slug:brand.slug,p_admin:false});data.products=data.products.map(cardProduct);}catch(e){if(e.status!==404)throw e;data=await legacyContext();}cached={time:Date.now(),data};return data;})();inflight=task;try{return await task}finally{if(inflight===task)inflight=null;}
}
async function detailRows(ids){const context=await loadCatalog();const filter={select:'*',store_id:'eq.'+context.store.id,active:'eq.true',id:`in.(${ids.join(',')})`};try{return await read('catalog_products',filter)}catch(e){if(e.status!==404)throw e;return read('products',filter)}}
export async function loadProduct(id,{force=false,expectedRevision,expectedLibraryRevision}={}){
 if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Produk tidak ditemukan.');const hit=details.get(id);if(!force&&hit&&Date.now()-hit.time<60000&&(!expectedRevision||hit.product.revision===expectedRevision)&&(!expectedLibraryRevision||hit.product.library_revision===expectedLibraryRevision))return hit.product;
 const[p]=await detailRows([id]);if(!p)throw Error('Produk sudah tidak tersedia. Muat ulang koleksi untuk melihat pilihan terbaru.');details.set(id,{time:Date.now(),product:p});return p;
}
export async function loadCheckoutProducts(ids){const unique=[...new Set(ids)];if(unique.length>100||unique.some(id=>!/^[a-f0-9-]{36}$/i.test(id)))throw Error('Pilihan pesanan tidak valid.');const rows=unique.length?await detailRows(unique):[];for(const p of rows)details.set(p.id,{time:Date.now(),product:p});return rows;}
