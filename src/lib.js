export const money = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
export const date = (v) =>
  v
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
export const productStock = (p) =>
  Number.isFinite(p.available_stock)?p.available_stock:p.has_colors ? p.variants.reduce((a, v) => a + v.stock, 0) : p.stock;
export function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export const stockLabel = (p) =>
  p.stock_confirm
    ? "Konfirmasi stok"
    : productStock(p) > 0
      ? `${productStock(p)} tersedia`
      : "Stok habis";
export function safeImage(src) {
  return typeof src === "string" &&
    ((src.startsWith("/") && !src.startsWith("//")) ||
      src.startsWith("https://"))
    ? src
    : "";
}
