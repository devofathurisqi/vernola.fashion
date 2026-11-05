import { optimizePhoto } from './image-upload.js';
import { createClient } from "@supabase/supabase-js";
import { brand } from "./config";
import { productPayload } from "./domain";
import {cardProduct} from './library-model';
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const db =
  url && key
    ? createClient(url, key, {
        auth: { storageKey: `catalog-auth-${brand.slug}` },
      })
    : null;
const cache = new Map();
export function invalidate() {
  cache.clear();
}
export async function loadCatalog({ admin = false, force = false } = {}) {
  if (!db) throw Error("Konfigurasi koneksi belum tersedia.");
  const k = admin ? "admin" : "public",
    cached = cache.get(k);
  if (!force && cached && Date.now() - cached.time < 30000) return cached.data;
  const context=await db.rpc('get_catalog_context',{p_slug:brand.slug,p_admin:admin});
  if(!context.error){const result={...context.data,products:context.data.products.map(cardProduct)};cache.set(k,{time:Date.now(),data:result});return result;}
  if(context.error.code!=='PGRST202')throw context.error;
  const { data: store, error } = await db
    .from("stores")
    .select("*")
    .eq("slug", brand.slug)
    .single();
  if (error)
    throw Error(
      "Koneksi katalog belum tersedia. Coba muat ulang beberapa saat lagi.",
    );
  const c = await db
    .from("categories")
    .select("*")
    .eq("store_id", store.id)
    .order("position")
    .order("name");
  if (c.error) throw c.error;
  const products = [];
  for (let offset = 0; ; offset += 200) {
    let query = db
      .from("products")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 199);
    if (!admin) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw error;
    products.push(...data);
    if (data.length < 200) break;
  }
  const result = { store, categories: c.data, products };
  cache.set(k, { time: Date.now(), data: result });
  return result;
}
export async function login(username, password) {
  if (username.trim().toLowerCase() !== brand.adminUsername)
    throw Error("Username atau kata sandi tidak sesuai.");
  if (!db) throw Error("Koneksi belum dikonfigurasi.");
  const { data, error } = await db.auth.signInWithPassword({
    email: brand.adminEmail,
    password,
  });
  if (error)
    throw Error(
      "Username atau kata sandi tidak sesuai, atau layanan belum tersedia.",
    );
  invalidate();
  return data;
}
export async function saveProduct(product, storeId) {
  const master=product.library_product_id?(product._master||await getLibraryProduct(product.library_product_id)):null;
  const payload = productPayload(product,storeId,master);
  let query = product.id
    ? db
        .from("products")
        .update(payload)
        .eq("id", product.id)
        .eq("store_id", storeId)
    : db.from("products").insert(payload);
  if (product.id && product.revision)
    query = query.eq("revision", product.revision);
  const { data, error } = await query.select();
  if (error)
    throw Error(
      error.code === "23505"
        ? "SKU sudah digunakan produk lain."
        : error.message,
    );
  if (!data?.length)
    throw Error(
      "Produk berubah pada sesi lain. Tutup editor, muat ulang, lalu coba lagi.",
    );
  invalidate();
  return data[0];
}
export async function getLibraryProduct(id){const{data,error}=await db.from('catalog_library_products').select('*').eq('id',id).single();if(error)throw error;return data;}
export async function getProduct(id,storeId){let result=await db.from('catalog_products').select('*').eq('id',id).eq('store_id',storeId).single();if(result.error?.code==='PGRST205')result=await db.from('products').select('*').eq('id',id).eq('store_id',storeId).single();if(result.error)throw Error('Produk sudah tidak tersedia. Muat ulang daftar.');const p=result.data;if(p.library_product_id)p._master=await getLibraryProduct(p.library_product_id);return p;}
export async function listLibrary(){const{data,error}=await db.from('catalog_library_cards').select('*').eq('active',true).order('category_name').order('name');if(error)throw Error('Katalog bersama belum tersedia. Pastikan migration terakhir sudah dijalankan.');return data;}
export async function attachLibraryProduct(libraryId,storeId){const{data,error}=await db.rpc('attach_library_product',{target_store:storeId,target_library:libraryId});if(error)throw error;invalidate();return data;}
export async function setProductVisibility(items,storeId,active){let changed=0;for(const p of items){let query=db.from('products').update({active}).eq('store_id',storeId).eq('id',p.id);if(p.revision)query=query.eq('revision',p.revision);const{data,error}=await query.select('id');if(error)throw error;if(!data?.length){invalidate();throw Error(`${changed} produk tersimpan; produk berikutnya telah berubah. Muat ulang sebelum melanjutkan.`);}changed++;}invalidate();}
export async function removeProduct(p, storeId) {
  let q = db.from("products").delete().eq("id", p.id).eq("store_id", storeId);
  if (p.revision) q = q.eq("revision", p.revision);
  const { data, error } = await q.select("id");
  if (error) throw error;
  if (!data?.length)
    throw Error("Produk telah berubah atau dihapus. Muat ulang daftar.");
  invalidate();
}
export async function saveCategory(p, storeId) {
  const payload = {
    store_id: storeId,
    name: p.name.trim(),
    description: p.description || "",
    position: Number(p.position) || 0,
  };
  if (!payload.name) throw Error("Nama kategori wajib diisi.");
  const { error } = await (p.id
    ? db
        .from("categories")
        .update(payload)
        .eq("store_id", storeId)
        .eq("id", p.id)
    : db.from("categories").insert(payload));
  if (error)
    throw Error(
      error.code === "23505"
        ? "Kategori dengan nama tersebut sudah ada."
        : error.message,
    );
  invalidate();
}
export async function removeCategory(id, storeId) {
  const { error } = await db
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
  if (error)
    throw Error(
      "Kategori masih digunakan. Pindahkan produk ke kategori lain dahulu.",
    );
  invalidate();
}
export async function saveSettings(p, storeId) {
  let whatsapp = p.whatsapp.replace(/\D/g, "");
  if (whatsapp.startsWith("0")) whatsapp = "62" + whatsapp.slice(1);
  if (!/^62\d{8,13}$/.test(whatsapp))
    throw Error("Nomor WhatsApp tidak valid. Gunakan nomor Indonesia.");
  if (!p.name.trim()) throw Error("Nama toko wajib diisi.");
  const { error } = await db
    .from("stores")
    .update({ name: p.name.trim(), tagline: p.tagline, whatsapp })
    .eq("id", storeId);
  if (error) throw error;
  invalidate();
}
export async function loadActivity(storeId) {
  const { data, error } = await db
    .from("catalog_activity")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) return null;
  return data;
}
export async function uploadPhoto(file, storeId, { onProgress = () => {} } = {}) {
  if (!db) throw Error("Koneksi belum dikonfigurasi.");
  onProgress('optimizing');
  const blob = await optimizePhoto(file);
  const path = `${storeId}/${crypto.randomUUID()}.webp`;
  onProgress('uploading');
  const { error } = await db.storage
    .from("catalog-images")
    .upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
    });
  if (error) {
    if (String(error.statusCode) === '413' || /maximum.*size|exceeded.*size|payload too large/i.test(error.message || ''))
      throw Error("Penyimpanan foto sedang bermasalah. Coba lagi atau hubungi pengelola.");
    throw Error("Unggah foto gagal. Periksa koneksi dan coba lagi.");
  }
  return db.storage.from("catalog-images").getPublicUrl(path).data.publicUrl;
}
export async function cleanPhotos(urls, storeId) {
  if (!urls.length) return;
  let allRows=await db.from('catalog_products').select('images,variants').eq('store_id',storeId);if(allRows.error?.code==='PGRST205')allRows=await db.from('products').select('images,variants').eq('store_id',storeId);if(allRows.error)throw allRows.error;const all={products:allRows.data};
  const used = new Set(
    all.products.flatMap((p) => [
      ...p.images,
      ...p.variants.map((v) => v.image),
    ]),
  );
  const prefix = `${url}/storage/v1/object/public/catalog-images/${storeId}/`;
  const paths = [...new Set(urls)]
    .filter((u) => u.startsWith(prefix) && !used.has(u))
    .map((u) => `${storeId}/${u.slice(prefix.length)}`);
  if (paths.length) {
    const { error } = await db.storage.from("catalog-images").remove(paths);
    if (error) throw error;
  }
}
