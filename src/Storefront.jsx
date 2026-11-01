import React, { useState, useEffect, useMemo, useDeferredValue, lazy, Suspense } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Search,
  X,
  Plus,
  Minus,
  Heart,
  MessageCircle,
  Menu,
  SlidersHorizontal,
  Check,
  ChevronRight,
  ChevronLeft,
  Flower2,
  Sparkles,
  Leaf,
  RefreshCw,
  ZoomIn,
  PackageCheck,
} from "lucide-react";
import { brand } from "./config";
import { loadCatalog,loadProduct,loadCheckoutProducts } from "./catalog";
import {variantCount} from './library-model';
import { stockFor, orderMessage } from "./domain";
import { money, productStock, readStorage, persist } from "./lib";
import { Dialog, Picture, Empty, Button, Toast } from "./ui";
const preview = new URLSearchParams(location.search).get("preview") === "1",
  bagKey = `${brand.slug}:bag:v2`,
  favoriteKey = `${brand.slug}:favorites:v2`;
const ProductDialog=lazy(()=>import('./ProductDialog'));
const initialBag = () =>
  readStorage(bagKey, [])
    .filter(
      (l) =>
        typeof l.id === "string" &&
        typeof l.key === "string" &&
        Number.isInteger(l.qty) &&
        l.qty > 0 &&
        l.qty <= 99 &&
        Number.isSafeInteger(l.price) &&
        l.price >= 0,
    )
    .slice(0, 100);
export default function Storefront() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [bag, setBag] = useState(initialBag),
    [bagOpen, setBagOpen] = useState(false),
    [favorites, setFavorites] = useState(() =>
      readStorage(favoriteKey, []).filter((x) => typeof x === "string"),
    ),
    [wishOnly, setWishOnly] = useState(false),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [notice, setNotice] = useState(""),
    [category, setCategory] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState("");
  const store = data?.store || brand;
  async function refresh(force = false) {
    setError("");
    try {
      const result = preview
        ? (await import("./preview")).previewData
        : await loadCatalog({ force });
      setData({...result,categories:result.categories.filter(c=>result.products.some(p=>p.category_id===c.id))});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, []);
  useEffect(() => persist(bagKey, bag), [bag]);
  useEffect(() => persist(favoriteKey, favorites), [favorites]);
  function favorite(id) {
    setFavorites((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  }
  function chooseCategory(id) {
    setCategory(id);
    setWishOnly(false);
    setMobile(false);
    document.getElementById("koleksi")?.scrollIntoView({ behavior: "smooth" });
  }
  function add(p, v, qty) {
    const key = p.id + ":" + (v?.id || ""),
      old = bag.find((l) => l.key === key),
      max = p.stock_confirm ? 99 : Math.min(99, stockFor(p, v?.id));
    if ((old?.qty || 0) + qty > max) {
      setToast("Jumlah pada tas sudah mencapai batas stok.");
      return;
    }
    const line = {
      key,
      id: p.id,
      variant_id: v?.id || "",
      name: p.name,
      color: v?.name || "",
      qty: (old?.qty || 0) + qty,
      price: p.price,
      image: v?.image || p.images[0],
    };
    setBag((b) =>
      old ? b.map((x) => (x.key === key ? line : x)) : [...b, line],
    );
    setSelected(null);
    setToast("Pilihanmu ditambahkan ke tas.");
    setBagOpen(true);
  }
  async function changeQty(line, delta) {
    try{const p=preview?data?.products.find(p=>p.id===line.id):await loadProduct(line.id);const max=p.stock_confirm?99:Math.min(99,stockFor(p,line.variant_id));setBag(b=>b.map(x=>{const next=x.qty+delta;return x.key===line.key&&next>=1&&next<=max?{...x,qty:next}:x}));}catch(e){setToast(e.message)}
  }
  async function checkout() {
    setBusy(true);
    try {
      const fresh = preview ? data : {store:(await loadCatalog({force:true})).store,products:await loadCheckoutProducts(bag.map(l=>l.id))};
      let changed = false;
      const lines = bag.map((l) => {
        const p = fresh.products.find((p) => p.id === l.id);
        if (!p)
          throw Error(
            `${l.name} sudah tidak tersedia. Hapus dari tas untuk melanjutkan.`,
          );
        const v = p.variants.find((v) => v.id === l.variant_id);
        if ((p.has_colors && !v) || (!p.has_colors && l.variant_id))
          throw Error(
            `Pilihan ${p.name} telah berubah. Hapus lalu pilih ulang produk.`,
          );
        if (p.price_confirm)
          throw Error(
            `Harga ${p.name} perlu dikonfirmasi. Hubungi admin terlebih dahulu.`,
          );
        if (!p.stock_confirm && stockFor(p, l.variant_id) < l.qty)
          throw Error(
            `Stok ${p.name} tidak mencukupi. Kurangi jumlah atau tanyakan admin.`,
          );
        if (l.price !== p.price) changed = true;
        return { ...l, name: p.name, color: v?.name || "", price: p.price };
      });
      setBag(lines);
      if (changed)
        throw Error(
          "Harga terbaru sudah diperbarui di tas. Periksa subtotal, lalu lanjutkan kembali.",
        );
      if (!fresh.store.whatsapp) throw Error("Nomor pemesanan belum tersedia.");
      location.assign(
        `https://wa.me/${fresh.store.whatsapp}?text=${encodeURIComponent(orderMessage(lines) + (notes.trim() ? `\n\nCatatan: ${notes.trim()}` : ""))}`,
      );
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="topbar">
        <span>
          <Flower2 size={13} /> A little elegance, every day.
        </span>
        <span>{store.tagline || brand.tagline}</span>
        <a href="#panduan">
          Belanja mudah via WhatsApp <ArrowUpRight size={12} />
        </a>
      </div>
      <header className="shop-header">
        <button
          className="icon mobile-nav"
          onClick={() => setMobile(true)}
          aria-label="Buka menu"
        >
          <Menu />
        </button>
        <a className="shop-logo" href="/" aria-label="Beranda Novola.fashion">
          <img
            src="/assets/novola-logo.webp"
            width="310"
            height="174"
            alt="Novola.fashion"
          />
        </a>
        <nav>
          <a href="#koleksi" className="selected">
            Koleksi <span className="nav-dot" />
          </a>
          <a href="#pilihan">Pilihan Novola</a>
          <a href="#cerita">Cerita kami</a>
        </nav>
        <div className="shop-actions">
          <button
            className="icon"
            aria-label="Cari koleksi"
            onClick={() => {
              document.getElementById("koleksi").scrollIntoView();
              document.getElementById("catalog-search")?.focus();
            }}
          >
            <Search size={21} />
          </button>
          <button
            className={`icon favorite-nav ${wishOnly ? "is-favorite" : ""}`}
            aria-label="Lihat favorit"
            onClick={() => {
              setWishOnly(!wishOnly);
              setCategory("");
              document.getElementById("koleksi").scrollIntoView();
            }}
          >
            <Heart size={21} />
            {favorites.length > 0 && <sup>{favorites.length}</sup>}
          </button>
          <button
            className="bag-trigger"
            aria-label={`Buka tas, ${bag.reduce((a, l) => a + l.qty, 0)} item`}
            onClick={() => setBagOpen(true)}
          >
            <ShoppingBag size={19} />
            <span>Tas</span>
            <b>{bag.reduce((a, l) => a + l.qty, 0)}</b>
          </button>
        </div>
      </header>
      {preview && (
        <div className="demo-banner">
          Pratinjau desain · Data contoh untuk melihat seluruh koleksi
        </div>
      )}
      <main>
        <section className="hero-v2">
          <div className="hero-decoration" aria-hidden="true">
            N
          </div>
          <div className="hero-text">
            <div className="eyebrow">
              <span /> THE NOVOLA EDIT
            </div>
            <h1>
              Warna lembut.
              <br />
              Kesan <em>yang kuat.</em>
            </h1>
            <p>
              Untuk hari yang biasa, dan momen yang istimewa.
              <br />
              Temukan hijab & fashion yang terasa seperti kamu.
            </p>
            <a className="btn btn-dark" href="#koleksi">
              Temukan favoritmu <ArrowUpRight size={19} />
            </a>
            <div className="hero-bottom">
              <span className="mini-flower">
                <Flower2 size={26} />
              </span>
              <span>
                Dipilih dengan hati.
                <br />
                <strong>Dikenakan dengan percaya diri.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-arch">
              <Picture
                src="/assets/product-9.jpg"
                alt="Gaya hijab lembut dari koleksi Novola"
                priority
                sizes="(max-width:700px) 75vw, 35vw"
              />
              <div className="arch-caption">soft shades, strong you.</div>
            </div>
            <div className="hero-small">
              <Picture
                src="/assets/product-6.jpg"
                alt="Detail warna Milo dari koleksi bergo"
                priority
                sizes="(max-width:700px) 30vw, 15vw"
              />
              <span>
                Made for
                <br />
                <em>your everyday.</em>
              </span>
            </div>
            <div className="hero-seal">
              <Flower2 size={22} />
              <span>
                EVERYDAY
                <br />
                ELEGANCE
              </span>
            </div>
            <span className="hero-edition">
              NOVOLA.FASHION / EVERYDAY COLLECTION
            </span>
          </div>
        </section>
        <div className="brand-ribbon">
          <span>YOUR EVERYDAY, BUT PRETTIER</span>
          <Flower2 />
          <span>HIJAB · FASHION · LITTLE DETAILS</span>
          <Flower2 />
          <span>YOUR EVERYDAY, BUT PRETTIER</span>
          <Flower2 />
        </div>
        <section className="category-section wrap">
          <div className="section-top">
            <div>
              <div className="eyebrow">A STYLE FOR EVERY STORY</div>
              <h2>
                Mulai dari <em>yang kamu suka.</em>
              </h2>
            </div>
            <a href="#koleksi" className="text-link">
              Semua koleksi <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="category-rail">
            {(data?.categories || []).map((c, i) => {
              const p = data.products.find(
                (p) => p.category_id === c.id && p.images[0],
              );
              return (
                <button
                  key={c.id}
                  className="category-tile"
                  onClick={() => chooseCategory(c.id)}
                >
                  <span className={`category-photo tone-${i % 3}`}>
                    <Picture src={p?.images[0]} alt={c.name} sizes="140px" />
                  </span>
                  <span>
                    {c.name}
                    <ArrowUpRight size={14} />
                  </span>
                  <small>
                    {data.products.filter((p) => p.category_id === c.id).length}{" "}
                    koleksi
                  </small>
                </button>
              );
            })}
            {loading &&
              [1, 2, 3, 4, 5, 6].map((n) => (
                <div className="category-skeleton skeleton" key={n} />
              ))}
          </div>
        </section>
        <section id="pilihan" className="featured-section">
          <div className="wrap">
            <div className="section-top">
              <div>
                <div className="eyebrow">
                  <Sparkles size={13} /> PICKED WITH LOVE
                </div>
                <h2>
                  Masuk daftar <em>favoritmu.</em>
                </h2>
              </div>
              <span className="editor-note">
                A few things we think you'll love.
              </span>
            </div>
            <div className="featured-grid">
              {data?.products
                .filter((p) => p.featured)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard
                    key={p.id}
                    {...{ p, data, favorites, favorite }}
                    open={() => setSelected(p)}
                  />
                ))}
            </div>
          </div>
        </section>
        <Catalog
          {...{
            data,
            loading,
            error,
            refresh,
            category,
            setCategory,
            wishOnly,
            setWishOnly,
            favorites,
            favorite,
          }}
          open={setSelected}
        />
        <section id="cerita" className="story-v2 wrap">
          <div className="story-images">
            <Picture
              src="/assets/product-8.jpg"
              alt="Inspirasi hijab Novola untuk keseharian"
              sizes="(max-width:700px) 90vw, 40vw"
            />
            <div className="story-quote">
              Wear it.
              <br />
              <em>Love it.</em>
              <br />
              Repeat.
            </div>
          </div>
          <div className="story-copy">
            <div className="eyebrow">A NOTE FROM NOVOLA</div>
            <h2>
              Cantik itu,
              <br />
              ketika kamu
              <br />
              <em>merasa nyaman.</em>
            </h2>
            <p>
              Kami percaya, sesuatu yang sederhana bisa membuat harimu terasa
              istimewa. Lewat warna, detail, dan pilihan yang dekat dengan
              keseharianmu.
            </p>
            <p>
              Dari hijab favorit sampai atasan yang melengkapi gaya—temukan
              versimu bersama Novola.fashion.
            </p>
            <a href="#koleksi" className="text-link">
              Kenali koleksi kami <ArrowUpRight size={17} />
            </a>
            <span className="signature">With love, Novola.</span>
          </div>
        </section>
        <section id="panduan" className="guide-v2 wrap">
          <div className="eyebrow">NO COMPLICATED CHECKOUT</div>
          <h2>
            Dari suka, <em>jadi punya.</em>
          </h2>
          <div className="guide-grid">
            {[
              [
                Search,
                "01",
                "Temukan pilihanmu",
                "Jelajahi kategori, foto, dan detail koleksi.",
              ],
              [
                ShoppingBag,
                "02",
                "Simpan di tas",
                "Pilih warna dan jumlah. Kumpulkan semua favoritmu.",
              ],
              [
                MessageCircle,
                "03",
                "Lanjut ke WhatsApp",
                "Admin mengonfirmasi stok, ongkir, dan pembayaran.",
              ],
            ].map(([Icon, n, t, d]) => (
              <article key={n}>
                <div>
                  <Icon size={24} />
                  <span>{n}</span>
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="contact-band">
          <Flower2 size={45} />
          <div>
            <span>BUTUH TEMAN MEMILIH?</span>
            <h2>Kami siap membantu.</h2>
          </div>
          <a
            className="btn btn-white"
            href={`https://wa.me/${store.whatsapp || "6281368732131"}`}
            target="_blank"
            rel="noreferrer"
          >
            Sapa Novola <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer className="shop-footer">
        <div className="footer-brand">
          <strong>{store.name}</strong>
          <p>{store.tagline}</p>
          <span>Cantiknya Dapet, Nyamannya ga bohong</span>
        </div>
        <div>
          <h3>Jelajahi</h3>
          <a href="#koleksi">Semua koleksi</a>
          <a href="#pilihan">Pilihan Novola</a>
          <a href="#cerita">Cerita kami</a>
        </div>
        <div>
          <h3>Kami di sini</h3>
          <a href="#panduan">Cara berbelanja</a>
          <a
            href={`https://wa.me/${store.whatsapp || "6281368732131"}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp <ArrowUpRight size={14} />
          </a>
          <a href="/admin">Novola Studio</a>
        </div>
        <div className="footer-line">
          <span>
            © {new Date().getFullYear()} {store.name}
          </span>
          <span>
            Everyday elegance, always you. <Heart size={12} />
          </span>
        </div>
      </footer>
      {mobile && (
        <Dialog
          title="Menu koleksi"
          onClose={() => setMobile(false)}
          className="mobile-menu"
        >
          <div className="eyebrow">EXPLORE NOVOLA</div>
          <h2>Temukan gayamu.</h2>
          <a
            href="#koleksi"
            onClick={() => {
              setCategory("");
              setWishOnly(false);
              setMobile(false);
            }}
          >
            Semua koleksi <ArrowUpRight />
          </a>
          <button onClick={()=>{setWishOnly(true);setCategory('');setMobile(false);document.getElementById('koleksi')?.scrollIntoView({behavior:'smooth'});}}>Favorit saya ({favorites.length})<Heart size={18}/></button>
          {data?.categories.map((c) => (
            <button key={c.id} onClick={() => chooseCategory(c.id)}>
              {c.name}
              <ChevronRight size={18} />
            </button>
          ))}
          <a href="/admin">Masuk Novola Studio</a>
        </Dialog>
      )}
      {selected && (
        <Suspense fallback={<Dialog title={selected.name} onClose={()=>setSelected(null)}><Empty title={selected.name} text="Menyiapkan detail koleksi…"/></Dialog>}>
        <ProductDialog
          key={selected.id}
          p={selected}
          store={store}
          onClose={() => setSelected(null)}
          add={add}
          favorite={() => favorite(selected.id)}
          isFavorite={favorites.includes(selected.id)}
        /></Suspense>
      )}
      {bagOpen && (
        <Dialog
          title="Tas belanja"
          onClose={() => setBagOpen(false)}
          className="bag-dialog"
        >
          <div className="dialog-heading">
            <div className="eyebrow">YOUR LOVELY FINDS</div>
            <h2>
              Tas belanja <span>({bag.length})</span>
            </h2>
          </div>
          {!bag.length ? (
            <Empty
              icon={ShoppingBag}
              title="Masih ada ruang untuk favoritmu."
              text="Temukan sesuatu yang membuat harimu lebih manis."
            >
              <Button
                onClick={() => {
                  setBagOpen(false);
                  document.getElementById("koleksi").scrollIntoView();
                }}
              >
                Jelajahi koleksi <ArrowRight size={16} />
              </Button>
            </Empty>
          ) : (
            <>
              <div className="bag-items">
                {bag.map((l) => (
                  <article key={l.key}>
                    <Picture src={l.image} alt={l.name} sizes="90px" />
                    <div>
                      <h3>{l.name}</h3>
                      <p>{l.color || "Tanpa pilihan warna"}</p>
                      <strong>{money(l.price)}</strong>
                      <div className="qty-control">
                        <button
                          aria-label={`Kurangi ${l.name}`}
                          onClick={() => changeQty(l, -1)}
                          disabled={l.qty <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{l.qty}</span>
                        <button
                          aria-label={`Tambah ${l.name}`}
                          onClick={() => changeQty(l, 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="icon"
                      aria-label={`Hapus ${l.name}`}
                      onClick={() =>
                        setBag((b) => b.filter((x) => x.key !== l.key))
                      }
                    >
                      <X size={16} />
                    </button>
                  </article>
                ))}
              </div>
              <div className="bag-summary">
                <label>
                  Catatan untuk admin <span>(opsional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Misalnya, pertanyaan bahan atau pengiriman…"
                    maxLength={500}
                    rows={2}
                  />
                </label>
                <div className="subtotal">
                  <span>Subtotal produk</span>
                  <strong>
                    {money(bag.reduce((a, l) => a + l.price * l.qty, 0))}
                  </strong>
                </div>
                <p>
                  Belum termasuk ongkir. Harga dan stok diperiksa kembali
                  sebelum membuka WhatsApp.
                </p>
                <Button className="full" busy={busy} onClick={checkout}>
                  Lanjut ke WhatsApp <ArrowUpRight size={18} />
                </Button>
                <small>
                  <PackageCheck size={13} /> Pesanan dikonfirmasi langsung oleh
                  admin.
                </small>
              </div>
            </>
          )}
        </Dialog>
      )}
      {notice && (
        <Dialog title="Informasi pesanan" onClose={() => setNotice("")}>
          <Empty
            icon={ShoppingBag}
            title="Periksa kembali pilihanmu"
            text={notice}
          >
            <Button onClick={() => setNotice("")}>Mengerti</Button>
          </Empty>
        </Dialog>
      )}
      <Toast message={toast} clear={() => setToast("")} />
    </>
  );
}
function ProductCard({ p, data, favorites, favorite, open }) {
  return (
    <article className="product-card">
      <div className="product-visual">
        <button
          className="product-image-button"
          onClick={open}
          aria-label={`Lihat ${p.name}`}
        >
          <Picture src={p.images[0]} alt={p.name} />
        </button>
        {p.featured && (
          <span className="product-badge">
            <Sparkles size={10} /> NOVOLA PICK
          </span>
        )}
        <button
          className={`favorite-button ${favorites.includes(p.id) ? "saved" : ""}`}
          aria-label={`${favorites.includes(p.id) ? "Hapus" : "Simpan"} favorit ${p.name}`}
          aria-pressed={favorites.includes(p.id)}
          onClick={() => favorite(p.id)}
        >
          <Heart size={17} />
        </button>
        <button className="quick-add" onClick={open}>
          Lihat pilihan <Plus size={16} />
        </button>
        {!p.stock_confirm && productStock(p) === 0 && (
          <span className="sold-badge">Habis</span>
        )}
      </div>
      <div className="product-category">
        {data?.categories.find((c) => c.id === p.category_id)?.name ||
          "Koleksi"}
      </div>
      <button className="product-name" onClick={open}>
        {p.name}
        <ArrowUpRight size={16} />
      </button>
      <div className="product-price">
        {p.price_confirm ? "Tanyakan harga" : money(p.price)}
      </div>
      {p.has_colors && (
        <div className="swatch-preview">
          {p.variants.slice(0, 5).map((v, i) => (
            <span
              key={v.id}
              title={v.name}
              style={{
                background: /^#[0-9a-f]{6}$/i.test(v.hex || "")
                  ? v.hex
                  : ["#d7b6af", "#c291ac", "#d2cbc9", "#795761", "#b8a4a1"][i],
              }}
            />
          ))}
          <small>{variantCount(p)} warna</small>
        </div>
      )}
    </article>
  );
}
function Catalog({
  data,
  loading,
  error,
  refresh,
  category,
  setCategory,
  wishOnly,
  setWishOnly,
  favorites,
  favorite,
  open,
}) {
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("recommended"),
    [available, setAvailable] = useState(false),
    [count, setCount] = useState(12),
    [filters, setFilters] = useState(false);
  const deferred = useDeferredValue(q);
  useEffect(
    () => setCount(12),
    [deferred, category, sort, wishOnly, available],
  );
  const products = useMemo(() => {
    const rows = (data?.products || []).filter(
      (p) =>
        (!category || p.category_id === category) &&
        (!wishOnly || favorites.includes(p.id)) &&
        (!available || p.stock_confirm || productStock(p) > 0) &&
        (p.search_text||`${p.name} ${p.sku || ""} ${p.description||''} ${p.variants.map((v) => v.name).join(" ")}`)
          .toLowerCase()
          .includes(deferred.toLowerCase()),
    );
    return rows.sort(
      sort === "low"
        ? (a, b) =>
            (a.price_confirm ? Infinity : a.price) -
            (b.price_confirm ? Infinity : b.price)
        : sort === "high"
          ? (a, b) =>
              (b.price_confirm ? -1 : b.price) -
              (a.price_confirm ? -1 : a.price)
          : sort === "name"
            ? (a, b) => a.name.localeCompare(b.name)
            : sort==='new'?(a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0):(a,b)=>Number(!!b.featured)-Number(!!a.featured)||Number(!!b.images.length)-Number(!!a.images.length)||Date.parse(b.created_at||0)-Date.parse(a.created_at||0),
    );
  }, [data, category, wishOnly, favorites, available, deferred, sort]);
  return (
    <section className="catalog-v2 wrap" id="koleksi">
      <div className="section-top">
        <div>
          <div className="eyebrow">THE EVERYDAY WARDROBE</div>
          <h2>
            {wishOnly ? (
              "Daftar favoritmu."
            ) : (
              <>
                Koleksi yang <em>bercerita.</em>
              </>
            )}
          </h2>
        </div>
        <p>
          Warna, bentuk, dan detail.
          <br />
          Pilih yang paling mencerminkanmu.
        </p>
      </div>
      <div className="catalog-bar">
        <label className="catalog-search">
          <Search size={18} />
          <input
            id="catalog-search"
            aria-label="Cari produk atau warna"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, warna, atau bahan…"
          />
          {q && (
            <button
              className="icon"
              onClick={() => setQ("")}
              aria-label="Hapus pencarian"
            >
              <X size={15} />
            </button>
          )}
        </label>
        <button
          className={`filter-button ${filters ? "on" : ""}`}
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
        >
          <SlidersHorizontal size={16} /> Filter
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Urutkan koleksi"
        >
          <option value="recommended">Pilihan Novola</option><option value="new">Terbaru</option>
          <option value="low">Harga terendah</option>
          <option value="high">Harga tertinggi</option>
          <option value="name">Nama A–Z</option>
        </select>
      </div>
      <div className="catalog-chips">
        <button
          className={!category && !wishOnly ? "active" : ""}
          onClick={() => {
            setCategory("");
            setWishOnly(false);
          }}
        >
          Semua koleksi
        </button>
        {data?.categories.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? "active" : ""}
            onClick={() => {
              setCategory(c.id);
              setWishOnly(false);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      {filters && (
        <div className="filter-panel">
          <label className="check-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Sembunyikan produk habis
          </label>
          <button
            onClick={() => {
              setQ("");
              setCategory("");
              setAvailable(false);
              setWishOnly(false);
              setSort("recommended");
            }}
          >
            Reset filter
          </button>
        </div>
      )}
      <div className="catalog-count">
        <span>
          {loading
            ? "Menyiapkan koleksimu…"
            : `${products.length} koleksi${category ? " · " + data?.categories.find((c) => c.id === category)?.name : ""}`}
        </span>
        <button
          className="icon"
          onClick={() => refresh(true)}
          aria-label="Muat ulang koleksi"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {loading ? (
        <div className="catalog-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton product-skeleton" />
          ))}
        </div>
      ) : error ? (
        <Empty icon={RefreshCw} title="Koleksi belum dapat dimuat" text={error}>
          <Button onClick={() => refresh(true)}>Coba lagi</Button>
        </Empty>
      ) : !products.length ? (
        <Empty
          icon={wishOnly ? Heart : Search}
          title={
            wishOnly ? "Favoritmu menunggu ditemukan." : "Belum ada yang cocok."
          }
          text={
            wishOnly
              ? "Ketuk ikon hati pada produk yang kamu suka."
              : "Coba kata kunci atau kategori lainnya."
          }
        >
          <Button
            onClick={() => {
              setQ("");
              setCategory("");
              setWishOnly(false);
              setAvailable(false);
            }}
          >
            Lihat semua koleksi
          </Button>
        </Empty>
      ) : (
        <>
          <div className="catalog-grid">
            {products.slice(0, count).map((p) => (
              <ProductCard
                key={p.id}
                {...{ p, data, favorites, favorite }}
                open={() => open(p)}
              />
            ))}
          </div>
          <div className="load-more">
            <span>
              Menampilkan {Math.min(count, products.length)} dari{" "}
              {products.length} koleksi
            </span>
            {count < products.length && (
              <Button
                className="btn-outline"
                onClick={() => setCount((c) => c + 12)}
              >
                Lebih banyak pilihan <Plus size={16} />
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
