import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  Settings,
  LogOut,
  ArrowUpRight,
  Plus,
  Search,
  RefreshCw,
  PenLine,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  ImagePlus,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Menu,
  X,
  Heart,
  Clock3,
  History,
  Upload,
  Save,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Flower2,
  Star,
  GripVertical,
  LibraryBig,
} from "lucide-react";
import { brand } from "./config";
import {
  db,
  login,
  loadCatalog,
  invalidate,
  saveProduct,
  removeProduct,
  saveCategory,
  removeCategory,
  saveSettings,
  loadActivity,
  uploadPhoto,
  cleanPhotos,
  getProduct,
  setProductVisibility,
} from "./api";
import{variantCount}from'./library-model';
import { money, date, productStock, stockLabel } from "./lib";
import { validateProduct } from "./domain";
import { Picture, Dialog, Button, Empty, Toast } from "./ui";
import "./admin.css";
const demo = new URLSearchParams(location.search).get("preview") === "1";
const SupplierLibrary=lazy(()=>import('./SupplierLibrary'));
const blank = () => ({
  name: "",
  sku: "",
  description: "",
  price: 0,
  stock: 0,
  category_id: null,
  has_colors: false,
  price_confirm: false,
  stock_confirm: false,
  variants: [],
  images: [],
  active: false,
  featured: false,
});
const menus = [
  [LayoutDashboard, "overview", "Ringkasan"],
  [Package, "products", "Produk"],
  [LibraryBig, "library", "Katalog Vuyama"],
  [Layers, "categories", "Kategori"],
  [History, "activity", "Aktivitas"],
  [Settings, "settings", "Pengaturan toko"],
];
export default function Admin() {
  const [session, setSession] = useState(null),
    [boot, setBoot] = useState(true),
    [data, setData] = useState(null),
    [authorized, setAuthorized] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("overview"),
    [productFilter, setProductFilter] = useState("all"),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [editor, setEditor] = useState(null),
    [catEditor, setCatEditor] = useState(null),
    [deleting, setDeleting] = useState(null),
    [activity, setActivity] = useState(null),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (demo) {
      import("./preview").then(({ previewData }) => {
        setData(structuredClone(previewData));
        setAuthorized(true);
        setBoot(false);
        setActivity([]);
      });
      return;
    }
    if (!db) {
      setBoot(false);
      setError("Koneksi Supabase belum dikonfigurasi.");
      return;
    }
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBoot(false);
    });
    const { data: s } = db.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      invalidate();
    });
    return () => s.subscription.unsubscribe();
  }, []);
  async function refresh(force = true) {
    if (demo) return;
    setBusy(true);
    setError("");
    try {
      const catalog = await loadCatalog({ admin: true, force });
      const { data: members, error } = await db
        .from("store_members")
        .select("store_id")
        .eq("store_id", catalog.store.id)
        .eq("user_id", session.user.id);
      if (error) throw error;
      if (!members?.length) {
        setAuthorized(false);
        throw Error(
          "Akun belum memiliki akses ke toko Vernola. Hubungkan akun melalui SQL membership.",
        );
      }
      setData(catalog);
      setAuthorized(true);
      setActivity(await loadActivity(catalog.store.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setAuthorized(false);
    if (session) refresh();
    else if (!demo) setData(null);
  }, [session?.user.id]);
  async function act(fn, message = "Perubahan berhasil disimpan.") {
    setBusy(true);
    try {
      await fn();
      if (!demo) await refresh();
      setToast(message);
      return true;
    } catch (e) {
      setToast(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(p) {
    p = validateProduct(p);
    if (demo) {
      const next = {
        ...p,
        id: p.id || crypto.randomUUID(),
        created_at: p.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setData((d) => ({
        ...d,
        products: p.id
          ? d.products.map((x) => (x.id === p.id ? next : x))
          : [next, ...d.products],
      }));
      setEditor(null);
      setToast("Pratinjau: produk tersimpan untuk sesi ini.");
      return;
    }
    const old = editor;
    await saveProduct(p, data.store.id);
    setEditor(null);
    try {
      await cleanPhotos(
        [
          ...old.images,
          ...old.variants.map((v) => v.image).filter(Boolean),
        ].filter(
          (src) =>
            ![...p.images, ...p.variants.map((v) => v.image)].includes(src),
        ),
        data.store.id,
      );
    } catch {
      setToast("Produk tersimpan. Sebagian file lama belum dapat dibersihkan.");
    }
    await refresh();
    setToast("Produk berhasil disimpan. Katalog telah diperbarui.");
  }
  async function openEditor(card,duplicate=false){if(busy)return;setBusy(true);try{const p=demo?structuredClone(card):await getProduct(card.id,data.store.id);if(duplicate){delete p.id;delete p.revision;delete p.created_at;delete p.library_product_id;delete p._master;delete p.content_overrides;p.name+=' (salinan)';p.sku='';p.active=false;}setEditor(p)}catch(e){setToast(e.message)}finally{setBusy(false)}}
  if (boot)
    return (
      <div className="boot">
        <span className="boot-mark">V</span>Menyiapkan Vernola Studio…
      </div>
    );
  if (!session && !demo) return <Login error={error} />;
  if (!data || !authorized)
    return (
      <div className="access-screen">
        <ShieldCheck size={38} />
        <h1>{busy ? "Menyiapkan ruang kerjamu…" : "Akses belum tersedia"}</h1>
        <p>{error || "Memeriksa akun dan toko."}</p>
        <Button busy={busy} onClick={() => refresh()}>
          Periksa kembali
        </Button>
        <button className="text-button" onClick={() => db.auth.signOut()}>
          Keluar
        </button>
      </div>
    );
  const published = data.products.filter((p) => p.active),
    unconfirmed = data.products.filter((p) => p.stock_confirm),
    low = data.products.filter((p) => !p.stock_confirm && productStock(p) <= 5);
  return (
    <div className="studio-shell">
      <aside className={`studio-sidebar ${mobile ? "open" : ""}`}>
        <a className="studio-brand" href="/admin">
          <span>
            V<span>✳</span>
          </span>
          <div>
            vernola<span>STUDIO</span>
          </div>
        </a>
        <button
          className="icon sidebar-close"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="store-switch">
          <span className="store-avatar">V</span>
          <div>
            <strong>{data.store.name}</strong>
            <small>Ruang kelola toko</small>
          </div>
          <ShieldCheck size={17} />
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="studio-nav">
          {menus.map(([Icon, id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setMobile(false);
              }}
            >
              <Icon size={19} />
              {label}
              {id === "products" && <span>{data.products.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <Flower2 size={25} />
          <strong>
            Big dreams.
            <br />
            Little details.
          </strong>
          <p>
            Koleksi yang rapi membuat pengalaman belanja lebih menyenangkan.
          </p>
          <a href="/" target="_blank" rel="noreferrer">
            Lihat katalog <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="sidebar-account">
          <span className="account-avatar">VE</span>
          <div>
            <strong>vernola</strong>
            <small>Administrator</small>
          </div>
          <button
            className="icon"
            aria-label="Keluar dashboard"
            onClick={() =>
              demo ? location.assign("/admin") : db.auth.signOut()
            }
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="studio-body">
        <header className="studio-top">
          <div>
            <button
              className="icon studio-menu"
              aria-label="Buka menu dashboard"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{menus.find((m) => m[1] === tab)?.[2]}</strong>
          </div>
          <div>
            <span className="connection-dot" />
            {demo ? "Mode pratinjau" : "Terhubung"}
            <button
              className="icon"
              disabled={busy}
              onClick={() => refresh()}
              aria-label="Muat ulang dashboard"
            >
              <RefreshCw size={17} className={busy ? "spin" : ""} />
            </button>
            <a
              className="visit-store"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              Lihat toko <ArrowUpRight size={15} />
            </a>
            <span className="top-avatar">V</span>
          </div>
        </header>
        {demo && (
          <div className="studio-demo">
            Pratinjau dashboard · Perubahan hanya berlaku selama sesi ini. Tidak
            menulis ke Supabase.
          </div>
        )}
        <main className="studio-main">
          {error && (
            <div className="inline-error" role="alert">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="studio-page-heading">
                <div>
                  <div className="eyebrow">YOUR STORE, YOUR STORY</div>
                  <h1>
                    Halo, Vernola <span className="hello-flower">✳</span>
                  </h1>
                  <p>Semua yang kamu butuhkan untuk merawat koleksimu.</p>
                </div>
                <Button onClick={() => setEditor(blank())}>
                  <Plus size={17} />
                  Tambah produk
                </Button>
              </div>
              <div className="studio-welcome">
                <div>
                  <span>LET'S MAKE IT A LOVELY DAY</span>
                  <h2>
                    Ruang kecil untuk
                    <br />
                    <em>usaha yang terus tumbuh.</em>
                  </h2>
                  <p>
                    Kelola produk, rapikan kategori, dan buat setiap pilihan
                    mudah ditemukan.
                  </p>
                  <button onClick={() => setTab("products")}>
                    Kelola koleksi <ArrowRight size={16} />
                  </button>
                </div>
                <div className="welcome-art">
                  <Picture
                    src="/assets/product-9.jpg"
                    alt="Koleksi Vernola"
                    sizes="220px"
                  />
                  <span>
                    With love,
                    <br />
                    <em>Vernola.</em>
                  </span>
                  <Flower2 size={44} />
                </div>
              </div>
              <div className="metric-grid">
                {[
                  [
                    Package,
                    data.products.length,
                    "Total produk",
                    "Semua koleksi toko",
                    "pink",
                  ],
                  [
                    Eye,
                    published.length,
                    "Produk tampil",
                    "Terlihat di katalog",
                    "purple",
                  ],
                  [
                    Layers,
                    data.categories.length,
                    "Kategori",
                    "Kelompok koleksi",
                    "orange",
                  ],
                  [
                    PackageCheckIcon,
                    unconfirmed.length,
                    "Stok konfirmasi",
                    "Perlu diperiksa admin",
                    "green",
                  ],
                ].map(([Icon, n, t, d, tone]) => (
                  <article className={`metric ${tone}`} key={t}>
                    <span>
                      <Icon size={20} />
                    </span>
                    <small>{t}</small>
                    <strong>{n}</strong>
                    <p>{d}</p>
                  </article>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Koleksi terbaru</h2>
                      <p>Sentuhan terakhir untuk etalase toko.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("products")}
                    >
                      Lihat semua <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="recent-products">
                    {data.products.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openEditor(p)}
                      >
                        <Picture src={p.images[0]} alt="" sizes="55px" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.price_confirm
                              ? "Konfirmasi harga"
                              : money(p.price)}
                          </small>
                        </div>
                        <span
                          className={`status-pill ${p.active ? "live" : "draft"}`}
                        >
                          {p.active ? "Tampil" : "Draft"}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel attention-panel">
                  <span className="attention-icon">
                    <AlertCircle size={24} />
                  </span>
                  <h2>Detail yang perlu perhatian</h2>
                  <p>
                    Pastikan informasi produk tetap sesuai dengan kondisi toko.
                  </p>
                  <button
                    onClick={() => {
                      setProductFilter("inquiry");
                      setTab("products");
                    }}
                  >
                    <span>Harga belum dikonfirmasi</span>
                    <strong>
                      {data.products.filter((p) => p.price_confirm).length}
                    </strong>
                    <ChevronRight size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setProductFilter("low");
                      setTab("products");
                    }}
                  >
                    <span>Stok rendah atau habis</span>
                    <strong>{low.length}</strong>
                    <ChevronRight size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setProductFilter("no-photo");
                      setTab("products");
                    }}
                  >
                    <span>Produk belum memiliki foto</span>
                    <strong>
                      {data.products.filter((p) => !p.images.length).length}
                    </strong>
                    <ChevronRight size={15} />
                  </button>
                  <div className="quiet-note">
                    <ShieldCheck size={16} />
                    Stok diperbarui manual setelah pesanan WhatsApp
                    dikonfirmasi.
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "products" && (
            <ProductTable
              initialStatus={productFilter}
              {...{ data, busy }}
              edit={p=>openEditor(p)}
              add={() => setEditor(blank())}
              duplicate={p=>openEditor(p,true)}
              remove={(p) => setDeleting({ type: "product", item: p })}
              bulk={async (items, active) => {
                await act(async () => {
                  if (demo)
                    setData((d) => ({
                      ...d,
                      products: d.products.map((p) =>
                        items.some((x) => x.id === p.id) ? { ...p, active } : p,
                      ),
                    }));
                  else await setProductVisibility(items,data.store.id,active);
                }, `${items.length} produk diperbarui.`);
              }}
            />
          )}
          {tab==='library'&&<Suspense fallback={<Empty icon={LibraryBig} title="Menyiapkan katalog Vuyama…"/>}><SupplierLibrary storeId={data.store.id} products={data.products} demo={demo} onAdded={async()=>{await refresh();setToast('Koleksi ditambahkan sebagai draft. Atur harga dan stok sebelum menampilkannya.');}}/></Suspense>}
          {tab === "categories" && (
            <>
              <div className="studio-page-heading">
                <div>
                  <div className="eyebrow">A PLACE FOR EVERY PIECE</div>
                  <h1>Kategori koleksi</h1>
                  <p>Bantu pelanggan menemukan yang mereka cari.</p>
                </div>
                <Button
                  onClick={() =>
                    setCatEditor({
                      name: "",
                      description: "",
                      position: data.categories.length,
                    })
                  }
                >
                  <Plus size={17} />
                  Tambah kategori
                </Button>
              </div>
              <div className="category-admin-grid">
                {data.categories.map((c) => {
                  const rows = data.products.filter(
                    (p) => p.category_id === c.id,
                  );
                  return (
                    <article className="panel category-admin-card" key={c.id}>
                      <div className="category-card-cover">
                        <Picture
                          src={rows.find((p) => p.images[0])?.images[0]}
                          alt={c.name}
                          sizes="300px"
                        />
                        <span>{rows.length} produk</span>
                      </div>
                      <div>
                        <div className="category-order">
                          URUTAN {c.position + 1}
                        </div>
                        <h2>{c.name}</h2>
                        <p>
                          {c.description || "Belum ada deskripsi kategori."}
                        </p>
                        <div className="category-card-actions">
                          <button onClick={() => setCatEditor({ ...c })}>
                            <PenLine size={15} />
                            Edit kategori
                          </button>
                          <button
                            aria-label={`Hapus kategori ${c.name}`}
                            className="icon"
                            onClick={() =>
                              setDeleting({ type: "category", item: c })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {tab === "activity" && (
            <>
              <div className="studio-page-heading">
                <div>
                  <div className="eyebrow">EVERY LITTLE UPDATE</div>
                  <h1>Aktivitas toko</h1>
                  <p>25 perubahan produk dan kategori terbaru.</p>
                </div>
              </div>
              <section className="panel activity-panel">
                {activity === null ? (
                  <Empty
                    icon={History}
                    title="Riwayat belum tersedia"
                    text="Jalankan migration peningkatan database agar perubahan berikutnya tercatat."
                  />
                ) : !activity.length ? (
                  <Empty
                    icon={History}
                    title="Cerita barumu dimulai di sini"
                    text="Perubahan produk dan kategori akan tampil setelah kamu menyimpannya."
                  />
                ) : (
                  activity.map((a) => (
                    <article key={a.id}>
                      <span
                        className={`activity-icon ${a.action.toLowerCase()}`}
                      >
                        {a.action === "DELETE" ? (
                          <Trash2 size={17} />
                        ) : a.action === "INSERT" ? (
                          <Plus size={17} />
                        ) : (
                          <PenLine size={17} />
                        )}
                      </span>
                      <div>
                        <strong>{a.entity_name}</strong>
                        <p>
                          {a.action === "INSERT"
                            ? "Ditambahkan ke koleksi"
                            : a.action === "DELETE"
                              ? "Dihapus dari koleksi"
                              : "Informasi diperbarui"}
                        </p>
                      </div>
                      <time>{date(a.created_at)}</time>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
          {tab === "settings" && (
            <SettingsForm
              store={data.store}
              demo={demo}
              onSave={async (p) => {
                if (demo) {
                  setData((d) => ({ ...d, store: { ...d.store, ...p } }));
                  setToast("Pratinjau: pengaturan diperbarui.");
                } else {
                  await saveSettings(p, data.store.id);
                  await refresh();
                  setToast("Pengaturan toko berhasil disimpan.");
                }
              }}
            />
          )}
        </main>
        <div className="studio-bottom">
          <span>VERNOLA STUDIO</span>
          <span>
            Made for the way you grow. <Flower2 size={12} />
          </span>
        </div>
      </div>
      {editor && (
        <ProductEditor
          initial={editor}
          categories={data.categories}
          storeId={data.store.id}
          demo={demo}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {catEditor && (
        <Dialog title="Editor kategori" onClose={() => setCatEditor(null)}>
          <CategoryEditor
            initial={catEditor}
            save={async (c) => {
              if (demo)
                setData((d) => ({
                  ...d,
                  categories: c.id
                    ? d.categories.map((x) => (x.id === c.id ? c : x))
                    : [...d.categories, { ...c, id: crypto.randomUUID() }],
                }));
              else {
                await saveCategory(c, data.store.id);
                await refresh();
              }
              setCatEditor(null);
              setToast("Kategori berhasil disimpan.");
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Konfirmasi penghapusan"
          onClose={() => !busy && setDeleting(null)}
        >
          <div className="confirm-delete">
            <span>
              <Trash2 size={29} />
            </span>
            <h2>
              Hapus {deleting.type === "product" ? "produk" : "kategori"} ini?
            </h2>
            <p>
              <strong>{deleting.item.name}</strong> akan dihapus.{" "}
              {deleting.type === "category"
                ? "Kategori hanya bisa dihapus jika tidak digunakan produk."
                : "Tindakan ini tidak dapat dibatalkan. Kamu juga bisa menjadikannya draft melalui editor."}
            </p>
            <div>
              <Button
                className="btn-outline"
                onClick={() => setDeleting(null)}
                disabled={busy}
              >
                Batal
              </Button>
              <Button
                className="btn-danger"
                busy={busy}
                onClick={() =>
                  act(async () => {
                    const { item, type } = deleting;
                    if (demo) {
                      if (
                        type === "category" &&
                        data.products.some((p) => p.category_id === item.id)
                      )
                        throw Error("Kategori masih digunakan produk.");
                      setData((d) => ({
                        ...d,
                        [type === "product" ? "products" : "categories"]: d[
                          type === "product" ? "products" : "categories"
                        ].filter((x) => x.id !== item.id),
                      }));
                    } else if (type === "product") {
                      const full=await getProduct(item.id,data.store.id);
                      await removeProduct(item, data.store.id);
                      await cleanPhotos(
                        [
                          ...full.images,
                          ...full.variants.map((v) => v.image).filter(Boolean),
                        ],
                        data.store.id,
                      );
                    } else await removeCategory(item.id, data.store.id);
                    setDeleting(null);
                  }, "Berhasil dihapus.")
                }
              >
                Ya, hapus
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      <Toast message={toast} clear={() => setToast("")} />
    </div>
  );
}
function PackageCheckIcon(props) {
  return <Package {...props} />;
}
function Login({ error: initialError }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError);
  return (
    <div className="studio-login">
      <div className="login-story">
        <a href="/" className="login-brand">
          vernola<span>STUDIO</span>
        </a>
        <div>
          <span className="eyebrow">A LITTLE SPACE FOR BIG DREAMS</span>
          <h1>
            Your collection.
            <br />
            Your story.
            <br />
            <em>Your studio.</em>
          </h1>
          <p>
            Ruang untuk mengelola setiap detail,
            <br />
            dan memberi tempat bagi usaha yang terus tumbuh.
          </p>
        </div>
        <div className="login-photo">
          <Picture
            src="/assets/product-9.jpg"
            alt="Koleksi Vernola"
            sizes="400px"
            priority
          />
          <span>
            Everyday elegance,
            <br />
            <em>behind the scenes.</em>
          </span>
        </div>
        <Flower2 className="login-flower" size={100} />
      </div>
      <div className="login-form-side">
        <a className="login-back" href="/">
          <ChevronLeft size={16} />
          Kembali ke katalog
        </a>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await login(username, password);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="login-emblem">
            V<Flower2 size={20} />
          </span>
          <div className="eyebrow">WELCOME TO VERNOLA STUDIO</div>
          <h2>Senang bertemu lagi.</h2>
          <p>Masuk untuk merawat koleksi dan mengelola tokomu.</p>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
            />
          </label>
          <label>
            Kata sandi
            <div className="password-field">
              <input
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                type={show ? "text" : "password"}
                required
              />
              <button
                type="button"
                className="icon"
                aria-label={
                  show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <div className="inline-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <Button type="submit" className="full" busy={busy}>
            Masuk ke studio <ArrowRight size={17} />
          </Button>
          <small>
            <ShieldCheck size={14} />
            Akses khusus pengelola toko.
          </small>
        </form>
        <span className="login-copyright">
          © {new Date().getFullYear()} Vernola.fashion · Made with care.
        </span>
      </div>
    </div>
  );
}
function ProductTable({
  data,
  busy,
  edit,
  add,
  duplicate,
  remove,
  bulk,
  initialStatus = "all",
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(initialStatus),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("recent"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [q, status, category, sort]);
  useEffect(
    () =>
      setSelected((s) =>
        s.filter((id) => data.products.some((p) => p.id === id)),
      ),
    [data],
  );
  const rows = useMemo(
    () =>
      data.products
        .filter(
          (p) =>
            (!category || p.category_id === category) &&
            (status === "all" ||
              (status === "active"
                ? p.active
                : status === "draft"
                  ? !p.active
                  : status === "inquiry"
                    ? p.price_confirm
                    : status === "no-photo"
                      ? !p.images.length
                      : !p.stock_confirm && productStock(p) <= 5)) &&
            `${p.name} ${p.sku || ""}`.toLowerCase().includes(q.toLowerCase()),
        )
        .sort(
          sort === "name"
            ? (a, b) => a.name.localeCompare(b.name)
            : sort === "price"
              ? (a, b) => a.price - b.price
              : () => 0,
        ),
    [data, q, status, category, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10)),
    current = Math.min(page, pages),
    visible = rows.slice((current - 1) * 10, current * 10);
  function toggle(id) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  return (
    <>
      <div className="studio-page-heading">
        <div>
          <div className="eyebrow">YOUR EVERYDAY COLLECTION</div>
          <h1>
            Koleksi produk{" "}
            <span className="count-pill">{data.products.length}</span>
          </h1>
          <p>Setiap detail kecil, tertata di satu tempat.</p>
        </div>
        <Button onClick={add}>
          <Plus size={17} />
          Tambah produk
        </Button>
      </div>
      <section className="panel product-panel">
        <div className="table-tabs">
          {[
            ["all", "Semua produk"],
            ["active", "Tampil"],
            ["draft", "Draft"],
            ["inquiry", "Harga konfirmasi"],
            ["low", "Stok rendah"],
            ["no-photo", "Tanpa foto"],
          ].map(([k, t]) => (
            <button
              key={k}
              className={status === k ? "active" : ""}
              onClick={() => setStatus(k)}
            >
              {t}
              {k === "all" && <span>{data.products.length}</span>}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={17} />
            <input
              placeholder="Cari nama produk atau SKU…"
              aria-label="Cari produk dashboard"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua kategori</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Urutkan produk dashboard"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Terbaru</option>
            <option value="name">Nama A–Z</option>
            <option value="price">Harga terendah</option>
          </select>
        </div>
        {selected.length > 0 && (
          <div className="bulk-bar">
            <span>{selected.length} produk dipilih</span>
            <button
              disabled={busy}
              onClick={async () => {
                await bulk(
                  data.products.filter((p) => selected.includes(p.id)),
                  true,
                );
                setSelected([]);
              }}
            >
              <Eye size={14} />
              Tampilkan
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                await bulk(
                  data.products.filter((p) => selected.includes(p.id)),
                  false,
                );
                setSelected([]);
              }}
            >
              <EyeOff size={14} />
              Jadikan draft
            </button>
            <button
              aria-label="Batalkan pilihan"
              onClick={() => setSelected([])}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Pilih semua pada halaman"
                    checked={
                      visible.length > 0 &&
                      visible.every((p) => selected.includes(p.id))
                    }
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...new Set([...s, ...visible.map((p) => p.id)])]
                          : s.filter((id) => !visible.some((p) => p.id === id)),
                      )
                    }
                  />
                </th>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  className={selected.includes(p.id) ? "checked" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${p.name}`}
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td>
                    <button
                      className="inventory-product"
                      onClick={() => edit(p)}
                    >
                      <Picture src={p.images[0]} alt="" sizes="55px" />
                      <span>
                        <strong>
                          {p.name}
                          {p.featured && <Star size={11} />}
                        </strong>
                        <small>
                          {p.sku || "Tanpa SKU"}
                          {p.has_colors ? ` · ${variantCount(p)} warna` : ""}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="table-category">
                      {data.categories.find((c) => c.id === p.category_id)
                        ?.name || "Tanpa kategori"}
                    </span>
                  </td>
                  <td>
                    <span className="table-price">
                      {p.price_confirm ? "Konfirmasi" : money(p.price)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`stock-text ${!p.stock_confirm && productStock(p) <= 5 ? "low" : ""}`}
                    >
                      {p.stock_confirm ? "Konfirmasi" : productStock(p)}
                      {!p.stock_confirm && <small> unit</small>}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${p.active ? "live" : "draft"}`}
                    >
                      <i />
                      {p.active ? "Tampil" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => edit(p)}
                      >
                        <PenLine size={16} />
                      </button>
                      <button
                        className="icon"
                        aria-label={`Duplikasi ${p.name}`}
                        onClick={() => duplicate(p)}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="icon delete-action"
                        aria-label={`Hapus ${p.name}`}
                        onClick={() => remove(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            icon={Package}
            title="Belum ada produk yang cocok"
            text="Coba filter lain atau tambahkan produk baru."
          >
            <Button onClick={add}>
              <Plus size={16} />
              Tambah produk
            </Button>
          </Empty>
        )}
        <div className="table-pagination">
          <span>
            {rows.length
              ? `${(current - 1) * 10 + 1}–${Math.min(current * 10, rows.length)}`
              : "0"}{" "}
            dari {rows.length} produk
          </span>
          <div>
            <button
              aria-label="Halaman sebelumnya"
              disabled={current <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              aria-label="Halaman berikutnya"
              disabled={current >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
function ProductEditor({
  initial,
  categories,
  storeId,
  demo,
  onClose,
  onSave,
}) {
  const [p, setP] = useState(structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [colorSearch, setColorSearch] = useState(""),
    [bulkStock, setBulkStock] = useState("");
  const uploaded = useRef([]),
    saved = useRef(false),
    original = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(p) !== original.current;
  const [discard, setDiscard] = useState(false);
  useEffect(
    () => () => {
      if (!demo) cleanPhotos(uploaded.current, storeId).catch(() => {});
    },
    [],
  );
  function set(k, v) {
    setP((p) => ({ ...p, [k]: v }));
  }
  function updateVariant(id, patch) {
    setP((p) => ({
      ...p,
      variants: p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  }
  function close() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function upload(files, variantId) {
    setBusy(true);
    setError("");
    try {
      if (demo)
        throw Error("Unggah foto tersedia setelah login ke dashboard online.");
      if (!variantId && p.images.length + files.length > 8)
        throw Error("Maksimal 8 foto galeri per produk.");
      for (const file of files) {
        const url = await uploadPhoto(file, storeId);
        uploaded.current.push(url);
        if (variantId) updateVariant(variantId, { image: url });
        else setP((p) => ({ ...p, images: [...p.images, url] }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function moveImage(i, d) {
    const images = [...p.images],
      target = i + d;
    if (target < 0 || target >= images.length) return;
    [images[i], images[target]] = [images[target], images[i]];
    set("images", images);
  }
  return (
    <Dialog
      wide
      title={p.id ? "Edit produk" : "Tambah produk"}
      onClose={close}
      className="editor-dialog"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(p);
            saved.current = true;
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="editor-top">
          <div>
            <div className="eyebrow">VERNOLA STUDIO / KOLEKSI</div>
            <h2>
              {p.id ? "Rawat detail koleksimu." : "Satu koleksi, cerita baru."}
            </h2>
            <p>
              {p.id
                ? "Perbarui informasi agar pelanggan lebih mudah memilih."
                : "Lengkapi informasi produk sebelum ditampilkan di katalog."}
            </p>
          </div>
          <span className={`status-pill ${p.active ? "live" : "draft"}`}>
            {p.active ? "Tampil di katalog" : "Draft"}
          </span>
        </div>
        <div className="editor-layout">
          <div className="editor-fields">
            {p.library_product_id&&<div className="shared-content-note"><LibraryBig size={19}/><div><strong>Dari katalog Vuyama</strong><p>Foto dan detail mengikuti katalog bersama. Perubahan yang kamu simpan hanya berlaku untuk toko ini.</p></div></div>}
            <section className="editor-section mobile-publish">
              <h3>Publikasi</h3>
              <label className="toggle-row">
                <div>
                  <strong>Tampilkan di katalog</strong>
                  <span>Nonaktifkan untuk menyimpan sebagai draft.</span>
                </div>
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => set("active", e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <div>
                  <strong>Pilihan Vernola</strong>
                  <span>Masukkan ke koleksi unggulan.</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!p.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
              </label>
            </section>
            <section className="editor-section">
              <div className="editor-section-title">
                <span>01</span>
                <div>
                  <h3>Informasi produk</h3>
                  <p>Mulai dari hal yang ingin pelanggan ketahui.</p>
                </div>
              </div>
              <label>
                Nama produk <b>*</b>
                <input
                  required
                  maxLength={160}
                  value={p.name}
                  placeholder="Contoh: Pashmina Modal Viscose"
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  SKU <span>(opsional)</span>
                  <input
                    value={p.sku || ""}
                    placeholder="VRN-001"
                    maxLength={80}
                    onChange={(e) => set("sku", e.target.value)}
                  />
                </label>
                <label>
                  Kategori
                  <select
                    value={p.category_id || ""}
                    onChange={(e) => set("category_id", e.target.value || null)}
                  >
                    <option value="">Tanpa kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Deskripsi
                <textarea
                  rows={5}
                  value={p.description}
                  maxLength={5000}
                  placeholder="Ceritakan bahan, ukuran, dan detail produk…"
                  onChange={(e) => set("description", e.target.value)}
                />
                <small>{p.description.length}/5000 karakter</small>
              </label>
            </section>
            <section className="editor-section">
              <div className="editor-section-title">
                <span>02</span>
                <div>
                  <h3>Harga & persediaan</h3>
                  <p>Informasi yang jelas membuat belanja lebih nyaman.</p>
                </div>
              </div>
              <div className="form-row">
                <label>
                  Harga jual (Rp)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={p.price}
                    onChange={(e) => set("price", Number(e.target.value))}
                    disabled={p.price_confirm}
                  />
                </label>
                <label>
                  Stok produk
                  <input
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={p.stock}
                    disabled={p.has_colors || p.stock_confirm}
                    onChange={(e) => set("stock", Number(e.target.value))}
                  />
                </label>
              </div>
              <label className="toggle-row">
                <div>
                  <strong>Tanyakan harga kepada admin</strong>
                  <span>Gunakan jika harga belum ditentukan.</span>
                </div>
                <input
                  type="checkbox"
                  checked={p.price_confirm}
                  onChange={(e) => set("price_confirm", e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <div>
                  <strong>Stok perlu dikonfirmasi</strong>
                  <span>Jumlah stok tidak ditampilkan kepada pelanggan.</span>
                </div>
                <input
                  type="checkbox"
                  checked={p.stock_confirm}
                  onChange={(e) => set("stock_confirm", e.target.checked)}
                />
              </label>
            </section>
            <section className="editor-section">
              <div className="editor-section-title">
                <span>03</span>
                <div>
                  <h3>Foto produk</h3>
                  <p>
                    Foto pertama menjadi sampul. Ubah urutan dengan tombol
                    panah.
                  </p>
                </div>
              </div>
              <label className={`upload-drop ${busy ? "disabled" : ""}`}>
                <Upload size={26} />
                <strong>Klik untuk menambahkan foto</strong>
                <span>
                  JPG, PNG, WebP · maks. 15 MB per foto · 8 foto galeri
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    upload([...e.target.files]);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="editor-gallery">
                {p.images.map((src, i) => (
                  <div key={src}>
                    <Picture src={src} alt={`Foto ${i + 1}`} sizes="150px" />
                    <span>{i === 0 ? "Sampul" : `Foto ${i + 1}`}</span>
                    <button
                      type="button"
                      aria-label={`Hapus foto ${i + 1}`}
                      className="icon image-remove"
                      onClick={() =>
                        setP((p) => ({
                          ...p,
                          images: p.images.filter((x) => x !== src),
                          variants: p.variants.map((v) =>
                            v.image === src ? { ...v, image: "" } : v,
                          ),
                        }))
                      }
                    >
                      <X size={13} />
                    </button>
                    <div>
                      <button
                        type="button"
                        aria-label={`Pindah foto ${i + 1} ke kiri`}
                        disabled={i === 0}
                        onClick={() => moveImage(i, -1)}
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Pindah foto ${i + 1} ke kanan`}
                        disabled={i === p.images.length - 1}
                        onClick={() => moveImage(i, 1)}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="field-hint">
                Foto otomatis diperkecil sebelum diunggah. Foto warna dapat
                diunggah terpisah pada bagian varian.
              </p>
            </section>
            <section className="editor-section">
              <div className="editor-section-title">
                <span>04</span>
                <div>
                  <h3>Pilihan warna</h3>
                  <p>Aktifkan hanya untuk produk yang memiliki varian.</p>
                </div>
              </div>
              <label className="toggle-row">
                <div>
                  <strong>Produk memiliki pilihan warna</strong>
                  <span>
                    Setiap warna dapat memiliki foto dan stok sendiri.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={p.has_colors}
                  onChange={(e) => set("has_colors", e.target.checked)}
                />
              </label>
              {p.has_colors && (
                <>
                  <div className="variant-toolbar">
                    <label className="table-search">
                      <Search size={15} />
                      <input
                        aria-label="Cari warna editor"
                        value={colorSearch}
                        onChange={(e) => setColorSearch(e.target.value)}
                        placeholder="Cari warna…"
                      />
                    </label>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => {
                        set("variants", [
                          ...p.variants,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            stock: 0,
                            image: "",
                            hex: "#e8a2c4",
                          },
                        ]);
                        setColorSearch("");
                      }}
                    >
                      <Plus size={14} />
                      Warna
                    </button>
                  </div>
                  <div className="variant-list">
                    {p.variants
                      .filter((v) =>
                        v.name
                          .toLowerCase()
                          .includes(colorSearch.toLowerCase()),
                      )
                      .map((v) => (
                        <div className="variant-item" key={v.id}>
                          <div className="variant-image">
                            <Picture
                              src={v.image || p.images[0]}
                              alt={v.name}
                              sizes="55px"
                            />
                            <label title="Ganti foto warna">
                              <ImagePlus size={13} />
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={busy}
                                onChange={(e) => {
                                  upload([...e.target.files], v.id);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                          <div className="variant-inputs">
                            <label>
                              Nama warna
                              <input
                                value={v.name}
                                required
                                maxLength={80}
                                onChange={(e) =>
                                  updateVariant(v.id, { name: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Stok
                              <input
                                type="number"
                                min="0"
                                max="2147483647"
                                step="1"
                                value={v.stock}
                                disabled={p.stock_confirm}
                                onChange={(e) =>
                                  updateVariant(v.id, {
                                    stock: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                            <label className="color-input-label">
                              Swatch
                              <input
                                type="color"
                                value={
                                  /^#[0-9a-f]{6}$/i.test(v.hex || "")
                                    ? v.hex
                                    : "#e8a2c4"
                                }
                                onChange={(e) =>
                                  updateVariant(v.id, { hex: e.target.value })
                                }
                              />
                            </label>
                            <label className="variant-select">
                              Foto galeri
                              <select
                                value={
                                  p.images.includes(v.image)
                                    ? v.image
                                    : "custom"
                                }
                                onChange={(e) => {
                                  if (e.target.value !== "custom")
                                    updateVariant(v.id, {
                                      image: e.target.value,
                                    });
                                }}
                              >
                                <option value="custom">
                                  {v.image
                                    ? "Foto warna saat ini"
                                    : "Ikuti sampul"}
                                </option>
                                {p.images.map((src, i) => (
                                  <option value={src} key={src}>
                                    Foto {i + 1}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <button
                            type="button"
                            className="icon delete-action"
                            aria-label={`Hapus warna ${v.name}`}
                            onClick={() =>
                              set(
                                "variants",
                                p.variants.filter((x) => x.id !== v.id),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                  </div>
                  <div className="variant-bulk">
                    <span>{p.variants.length} warna</span>
                    <label>
                      Samakan stok
                      <input
                        aria-label="Jumlah stok semua warna"
                        type="number"
                        min="0"
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                        disabled={p.stock_confirm}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        p.stock_confirm ||
                        bulkStock === "" ||
                        !Number.isInteger(Number(bulkStock)) ||
                        Number(bulkStock) < 0
                      }
                      onClick={() =>
                        set(
                          "variants",
                          p.variants.map((v) => ({
                            ...v,
                            stock: Number(bulkStock),
                          })),
                        )
                      }
                    >
                      Terapkan
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
          <aside className="editor-preview">
            <span className="eyebrow">PRATINJAU KARTU PRODUK</span>
            <div className="preview-card">
              <Picture
                src={p.images[0]}
                alt={p.name || "Pratinjau produk"}
                sizes="260px"
              />
              <small>
                {categories.find((c) => c.id === p.category_id)?.name ||
                  "Koleksi"}
              </small>
              <strong>{p.name || "Nama produkmu"}</strong>
              <b>{p.price_confirm ? "Tanyakan harga" : money(p.price)}</b>
              {p.has_colors && <span>{p.variants.length} pilihan warna</span>}
            </div>
            <div className="publish-options">
              <label className="toggle-row">
                <div>
                  <strong>Tampilkan produk</strong>
                  <span>Terlihat oleh pelanggan.</span>
                </div>
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => set("active", e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <div>
                  <strong>Pilihan Vernola</strong>
                  <span>Masuk koleksi unggulan.</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!p.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
              </label>
            </div>
            <div className="editor-tip">
              <Heart size={18} />
              <p>
                Foto yang jelas dan deskripsi yang lengkap membantu pelanggan
                memilih dengan yakin.
              </p>
            </div>
          </aside>
        </div>
        <div className="editor-footer">
          <div>
            {error ? (
              <span className="editor-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </span>
            ) : (
              <span>
                {dirty
                  ? "Ada perubahan yang belum disimpan."
                  : "Semua detail siap dikelola."}
              </span>
            )}
          </div>
          <Button
            type="button"
            className="btn-outline"
            onClick={close}
            disabled={busy}
          >
            Batal
          </Button>
          <Button type="submit" busy={busy}>
            <Save size={17} />
            Simpan produk
          </Button>
        </div>
      </form>
      {discard && (
        <Dialog
          title="Perubahan belum disimpan"
          onClose={() => setDiscard(false)}
        >
          <Empty
            icon={PenLine}
            title="Simpan dulu ceritamu?"
            text="Ada perubahan yang belum disimpan. Menutup editor akan membuang perubahan tersebut."
          >
            <div className="dialog-actions">
              <Button className="btn-outline" onClick={() => setDiscard(false)}>
                Lanjut edit
              </Button>
              <Button onClick={onClose}>Buang perubahan</Button>
            </div>
          </Empty>
        </Dialog>
      )}
    </Dialog>
  );
}
function CategoryEditor({ initial, save }) {
  const [p, setP] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="simple-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await save(p);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="eyebrow">MAKE ROOM FOR YOUR COLLECTION</div>
      <h2>{p.id ? "Edit kategori" : "Kategori baru"}</h2>
      <label>
        Nama kategori
        <input
          required
          maxLength={80}
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
      </label>
      <label>
        Deskripsi
        <textarea
          rows={3}
          value={p.description}
          maxLength={500}
          onChange={(e) => setP({ ...p, description: e.target.value })}
        />
      </label>
      <label>
        Urutan tampil
        <input
          type="number"
          min="0"
          step="1"
          required
          value={p.position}
          onChange={(e) => setP({ ...p, position: Number(e.target.value) })}
        />
        <small>Angka lebih kecil tampil lebih awal, dimulai dari 0.</small>
      </label>
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      <Button className="full" busy={busy}>
        <Save size={16} />
        Simpan kategori
      </Button>
    </form>
  );
}
function SettingsForm({ store, onSave }) {
  const [p, setP] = useState({ ...store }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <div className="studio-page-heading">
        <div>
          <div className="eyebrow">THE DETAILS BEHIND YOUR BRAND</div>
          <h1>Pengaturan toko</h1>
          <p>Informasi yang menghubungkan kamu dengan pelanggan.</p>
        </div>
      </div>
      <form
        className="settings-layout"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(p);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Identitas & kontak</h2>
              <p>
                Perubahan berlaku untuk informasi toko dan tautan pemesanan.
              </p>
            </div>
            <Settings size={22} />
          </div>
          <label>
            Nama toko
            <input
              required
              maxLength={120}
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </label>
          <label>
            Tagline
            <input
              maxLength={180}
              value={p.tagline}
              onChange={(e) => setP({ ...p, tagline: e.target.value })}
            />
          </label>
          <label>
            Nomor WhatsApp
            <input
              required
              inputMode="tel"
              value={p.whatsapp}
              onChange={(e) => setP({ ...p, whatsapp: e.target.value })}
            />
            <small>
              Contoh: 081368732131 atau 6281368732131. Dipakai di seluruh tombol
              pemesanan dan kontak.
            </small>
          </label>
          {error && (
            <p role="alert" className="editor-error">
              {error}
            </p>
          )}
          <Button busy={busy}>
            <Save size={16} />
            Simpan pengaturan
          </Button>
        </section>
        <aside>
          <section className="panel settings-note">
            <ShieldCheck size={26} />
            <h2>Akses admin</h2>
            <p>
              Username: <strong>vernola</strong>
            </p>
            <p>
              Kata sandi dikelola melalui Supabase Auth. Hubungi pengelola
              website untuk pemulihan akses.
            </p>
          </section>
          <section className="panel settings-note">
            <ShoppingBag size={26} />
            <h2>Alur pesanan</h2>
            <p>
              Pesanan diteruskan ke WhatsApp. Stok diperbarui manual setelah
              konfirmasi; membuka WhatsApp tidak mengurangi persediaan.
            </p>
          </section>
        </aside>
      </form>
    </>
  );
}
