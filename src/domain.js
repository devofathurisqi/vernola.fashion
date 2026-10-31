import {buildLibraryOverrides} from './library-model.js';
export function validateProduct(p) {
  if (!p.name?.trim()) throw Error("Nama produk wajib diisi.");
  if (p.name.trim().length > 160)
    throw Error("Nama produk maksimal 160 karakter.");
  if ((p.description || "").length > 5000)
    throw Error("Deskripsi maksimal 5000 karakter.");
  if (!Number.isSafeInteger(p.price) || p.price < 0)
    throw Error("Harga harus berupa rupiah bulat, minimal 0.");
  if (!Number.isSafeInteger(p.stock) || p.stock < 0 || p.stock > 2147483647)
    throw Error("Stok harus bilangan bulat, minimal 0.");
  if (p.has_colors && !p.variants?.length)
    throw Error("Tambahkan minimal satu warna.");
  const names = new Set();
  const ids = new Set();
  if (p.images && (!Array.isArray(p.images) || p.images.length > 8))
    throw Error("Maksimal 8 foto galeri.");
  for (const src of p.images || [])
    if (
      typeof src !== "string" ||
      !(
        (src.startsWith("/") && !src.startsWith("//")) ||
        src.startsWith("https://")
      )
    )
      throw Error("Alamat foto tidak valid.");
  for (const v of p.has_colors ? p.variants : []) {
    if (
      !v.name?.trim() ||
      v.name.trim().length > 80 ||
      !Number.isSafeInteger(v.stock) ||
      v.stock < 0 ||
      v.stock > 2147483647
    )
      throw Error("Nama dan stok warna wajib valid.");
    const key = v.name.trim().toLowerCase();
    if (names.has(key)) throw Error("Nama warna tidak boleh sama.");
    names.add(key);
    if (v.id) {
      if (ids.has(v.id)) throw Error("ID varian tidak boleh sama.");
      ids.add(v.id);
    }
  }
  return {
    ...p,
    name: p.name.trim(),
    variants: p.has_colors ? p.variants : [],
  };
}
export function stockFor(p, variant) {
  return p.has_colors
    ? (p.variants.find((v) => v.id === variant)?.stock ?? 0)
    : p.stock;
}
export function productPayload(product,storeId,master=null){
  const p=validateProduct(product);
  const payload={store_id:storeId,category_id:p.category_id||null,name:p.name,description:p.description||'',sku:p.sku?.trim()||'',price:p.price,price_confirm:!!p.price_confirm,stock:p.stock,stock_confirm:!!p.stock_confirm,images:p.images||[],has_colors:!!p.has_colors,variants:p.variants,active:!!p.active,featured:!!p.featured};
  if(p.library_product_id){if(!master||master.id!==p.library_product_id)throw Error('Referensi master belum dimuat. Buka ulang editor.');Object.assign(payload,{library_product_id:p.library_product_id,content_overrides:buildLibraryOverrides(p,master),description:'',images:[],has_colors:false,variants:[]});}
  return payload;
}
export function orderMessage(lines) {
  let total = 0;
  for (const l of lines) {
    if (
      !Number.isInteger(l.qty) ||
      l.qty < 1 ||
      l.qty > 99 ||
      !Number.isSafeInteger(l.price) ||
      l.price < 0 ||
      !Number.isSafeInteger(l.price * l.qty)
    )
      throw Error("Jumlah atau harga pesanan tidak valid.");
    total += l.price * l.qty;
    if (!Number.isSafeInteger(total))
      throw Error("Total pesanan melebihi batas perhitungan.");
  }
  return `Halo Vernola.fashion, saya ingin konfirmasi pesanan:\n\n${lines.map((l) => `${l.name}${l.color ? " / " + l.color : ""}\n${l.qty} × Rp${l.price.toLocaleString("id-ID")} = Rp${(l.qty * l.price).toLocaleString("id-ID")}`).join("\n\n")}\n\nSubtotal: Rp${lines.reduce((s, l) => s + l.qty * l.price, 0).toLocaleString("id-ID")}\nMohon konfirmasi stok, ongkir, dan total pembayaran.`;
}
