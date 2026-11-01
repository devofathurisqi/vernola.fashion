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
export function orderTotals(lines) {
  let total = 0, quantity = 0, unconfirmed = 0;
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
    quantity += l.qty;
    if (l.price_confirm) unconfirmed += 1;
    else total += l.price * l.qty;
    if (!Number.isSafeInteger(total))
      throw Error("Total pesanan melebihi batas perhitungan.");
  }
  return { total, quantity, unconfirmed };
}
export function prepareOrder(lines, products) {
  if (!lines.length) throw Error("Keranjang masih kosong.");
  orderTotals(lines);
  let pricesChanged = false;
  const freshLines = lines.map((l) => {
    const p = products.find((p) => p.id === l.id && p.active !== false);
    if (!p) throw Error(`${l.name} sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan.`);
    const v = p.variants.find((v) => v.id === l.variant_id);
    if ((p.has_colors && !v) || (!p.has_colors && l.variant_id))
      throw Error(`Pilihan ${p.name} telah berubah. Hapus lalu pilih ulang produk.`);
    if (!p.stock_confirm && stockFor(p, l.variant_id) < l.qty)
      throw Error(`Stok ${p.name} tidak mencukupi. Kurangi jumlah atau tanyakan admin.`);
    if (Boolean(l.price_confirm) !== Boolean(p.price_confirm) || (!p.price_confirm && l.price !== p.price))
      pricesChanged = true;
    return { ...l, name: p.name, color: v?.name || "", price: p.price, price_confirm: Boolean(p.price_confirm) };
  });
  orderTotals(freshLines);
  return { lines: freshLines, pricesChanged };
}
export function orderMessage(lines, { notes = "" } = {}) {
  if (!lines.length) throw Error("Keranjang masih kosong.");
  const { total, quantity, unconfirmed } = orderTotals(lines);
  const rupiah = (value) => `Rp${value.toLocaleString("id-ID")}`;
  const details = lines.map((l, i) => [
    `${i + 1}. *${l.name}*`,
    ...(l.color ? [`   Warna: ${l.color}`] : []),
    `   Jumlah: ${l.qty} pcs`,
    `   Harga satuan: ${l.price_confirm ? "Menunggu konfirmasi admin" : rupiah(l.price)}`,
    `   Subtotal: ${l.price_confirm ? "Menunggu konfirmasi admin" : rupiah(l.qty * l.price)}`,
  ].join("\n")).join("\n\n");
  const subtotal = unconfirmed === lines.length
    ? "Subtotal produk: Menunggu konfirmasi admin"
    : `${unconfirmed ? "Subtotal harga tersedia" : "Subtotal produk"}: ${rupiah(total)}`;
  return [
    "Halo Novola.fashion, saya ingin konfirmasi pesanan:",
    "*RINCIAN PESANAN*\n" + details,
    `*RINGKASAN*\nTotal: ${quantity} pcs (${lines.length} pilihan)\n${subtotal}${unconfirmed ? `\n${unconfirmed} pilihan produk menunggu konfirmasi harga.` : ""}`,
    ...(notes.trim() ? [`*CATATAN*\n${notes.trim()}`] : []),
    "Belum termasuk ongkir. Mohon konfirmasi stok, ongkir, dan total pembayaran.",
  ].join("\n\n");
}
