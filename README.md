# Novola.fashion — katalog & dashboard

Implementasi pertama paket katalog Rp350.000 sekali bayar. Baca file ini saat melanjutkan pekerjaan atau menyiapkan klien berikutnya. Toko lain di workspace tidak diubah.

Repository: [devofathurisqi/vernola.fashion](https://github.com/devofathurisqi/vernola.fashion). Folder aplikasi ini merupakan root repository; aplikasi tidak bergantung pada toko lain untuk install, test, atau build.

## Status terbaru 1 November 2026

- Brand yang benar adalah **Novola.fashion**. Seluruh tulisan, logo, metadata, pesan WhatsApp dan tampilan admin sudah disesuaikan.
- Username admin **novola**. Kata sandi sudah diperbarui langsung melalui Supabase Auth sesuai instruksi pemilik; nilainya tidak disimpan dalam repository atau panduan publik.
- Katalog toko kini berisi **4 contoh produk Novola**. Sebanyak 27 listing Vuyama telah dihapus dari tenant ini melalui akses admin, tanpa SQL Editor. Master/foto Vuyama bersama tetap tersedia untuk klien lain dan picker opsional.
- Preview desain juga hanya berisi 4 produk, sehingga mode preview tidak memunculkan kembali listing Vuyama yang sudah dihapus.
- ID/slug teknis `vernola-fashion`, alias Auth lama, folder lokal dan nama repository GitHub dipertahankan untuk kompatibilitas. **Jangan mengganti VITE_STORE_SLUG di Vercel**; env yang sudah dipasang tetap berlaku. Login pengguna memakai novola, bukan alias teknis tersebut.
- Kategori kosong disimpan untuk pengelolaan admin dan disembunyikan dari katalog pelanggan.
- Materi siap kirim: [panduan klien PDF](docs/Panduan-Klien-Novola-Fashion.pdf) dan [video promosi 34 detik](deliverables/Promo-Katalog-Dashboard-350-Novola.mp4). Panduan yang dapat diperbarui: [docs/PANDUAN-KLIEN.md](docs/PANDUAN-KLIEN.md). Bagian verifikasi V1/V2/V3 dan detail di bawah adalah rekaman implementasi sebelumnya; angka 31 produk dan akun lama sudah disupersede oleh status ini.
- Setup/migration impor lama tetap disimpan sebagai riwayat. **Jangan menjalankan ulang seed Vuyama pada toko ini.** Tidak ada SQL baru untuk perubahan brand dan akun ini.

## Riwayat implementasi sebelum koreksi nama

- Storefront pink editorial, navbar menyatu dengan warna tepi logo `#fde9e9`, kategori dinamis, pencarian produk/bahan/seluruh warna, urutan rekomendasi, favorit, tas, dan pesanan melalui WhatsApp.
- Detail produk dimuat saat dibuka. Koleksi dengan lebih dari 12 warna memiliki pencarian warna sendiri; pilihan mengganti foto dan stok varian yang sesuai. Menu mobile juga menyediakan favorit.
- Dashboard: ringkasan data nyata, CRUD produk/kategori, galeri dan foto per warna, draft/publikasi massal, duplikasi, konflik edit, audit, pengaturan kontak, serta **Katalog Vuyama** untuk menambahkan produk master sebagai draft.
- Supabase online: **31 produk / 9 kategori**. Empat contoh Vernola dan 27 listing yang mereferensikan master Vuyama; master memiliki 468 varian dan 410 foto sumber unik. Harga impor memakai referensi ecer, bukan harga khusus Sugar Shawl. Stok impor belum dikonfirmasi.
- Pengguna mengonfirmasi setup awal, `UPGRADE-VERNOLA.sql`, dan terakhir **`FINAL-SHARED-LIBRARY.sql` berhasil**. Tidak ada SQL tambahan yang perlu dijalankan untuk hasil ini.
- Username `vernola` memakai alias Auth yang disetujui: `vernola@vernola-fashion.admin.invalid`. Password tidak disimpan di source. Alias tidak menerima email pemulihan; reset ditangani pengelola Supabase.
- Preview produksi lokal: http://127.0.0.1:4183/ dan `/admin`. Belum deploy publik/Vercel. Lihat [qa/RESULTS-V3.md](qa/RESULTS-V3.md) untuk bukti dan batas verifikasi. V1/V2 adalah laporan historis.

## Menjalankan

Node.js 22+, dari folder ini:

```powershell
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Port standar 4180. `.env.local` diabaikan Git. Checkout baru menggunakan `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STORE_SLUG`. Jangan menaruh secret/service-role key di variabel VITE atau bundle. RLS tetap wajib.

Setelah clone, salin `.env.example` menjadi `.env.local` lalu isi publishable key project. Data/schema Supabase yang sudah aktif tidak perlu diinisialisasi ulang.

`?preview=1` memakai data contoh. `/admin?preview=1` hanya mengubah memori sesi dan tidak melakukan upload online; gunakan `/admin` untuk mengelola toko sebenarnya.

## Struktur aplikasi

| File | Tanggung jawab |
| --- | --- |
| `src/Storefront.jsx` | Katalog, pencarian/filter/urutkan, favorit, tas, validasi checkout |
| `src/ProductDialog.jsx` | Detail dan pencarian warna; lazy-loaded |
| `src/Admin.jsx` | Login, ringkasan, inventori/editor, kategori, audit, pengaturan |
| `src/SupplierLibrary.jsx` | Picker master Vuyama; lazy-loaded |
| `src/catalog.js` | REST publik tanpa SDK: bootstrap ringkas, cache, full detail dan revalidasi checkout |
| `src/api.js` | SDK admin, Auth, CRUD dengan revision, library attach, upload/cleanup |
| `src/domain.js`, `src/library-model.js` | Validasi data, pesanan, perhitungan override master yang jarang |
| `src/media.js`, `src/local-image-manifest.json` | Srcset foto lokal dan URL responsive shared Storage |
| `src/ui.jsx` | Dialog, gambar, button, empty state, toast |
| `src/config.js` | Brand, slug, username dan alias login per klien |
| `catalog/` | Master/manifest shared dan baseline V2 untuk migrasi yang mempertahankan edit |
| `supabase/007_shared_library.sql` | Struktur library, RLS, views, RPC, validasi listing |
| `supabase/008_seed_shared_vuyama.sql` | Seed master dan migrasi listing lama tanpa menimpa edit klien |

## Satu database untuk banyak toko

Setiap listing, kategori dan akun membership milik toko tertentu. `store_id`, RLS dan foreign key menjaga pemisahan. Browser tidak dapat membuat membership atau memindahkan tenant. Kategori yang sedang digunakan tidak dapat dihapus. `catalog_activity` merekam perubahan; client hanya membacanya untuk toko sendiri.

**Vuyama disimpan sekali:** `catalog_library_products` menyimpan nama, deskripsi, foto, seluruh warna dan referensi harga. Tabel ini publik untuk dibaca; admin klien tidak boleh mengubahnya. `catalog_library_cards` adalah versi ringkas untuk picker. Flag master active menentukan ketersediaan pada picker, sedangkan listing yang sudah dipakai tetap mengikuti keputusan publikasi toko.

`products` menyimpan listing toko: kategori, harga jual, SKU, stok, draft/tampil, featured, revision, serta `library_product_id`. Deskripsi, galeri dan varian master tidak disalin ke kolom fisik listing. `content_overrides` hanya berisi perbedaan yang dipilih toko. Satu perubahan stok warna disimpan sebagai delta warna itu. Jika klien menambah/menghapus/mengurutkan pilihan warna, daftar varian lengkap disimpan sebagai override lokal agar pilihan tersebut tetap persis.

`catalog_products` menggabungkan master dan perubahan lokal. `catalog_product_cards` hanya membawa foto pertama dan maksimal 5 preview warna, tetapi jumlah warna/stok dan teks pencarian mencakup seluruh pilihan. Semua view memakai `security_invoker=true` agar RLS tabel tetap berlaku. `get_catalog_context` mengirim store, kategori dan kartu dalam satu request. Mode admin memerlukan membership.

`attach_library_product` memeriksa hak toko dan menghubungkan master tanpa duplikasi foto/varian. Listing baru **draft**, stok menunggu konfirmasi, harga awal mengikuti referensi; admin meninjau sebelum publikasi. Satu master hanya dapat ditambahkan sekali per toko. Produk buatan klien tetap CRUD mandiri.

Save mengirim revision yang dibuka editor. Update dengan revision lama ditolak agar tidak menimpa perubahan sesi lain. Harga/stok/publikasi toko lain dan master tidak berubah saat satu toko mengedit listingnya. Stok diperbarui manual setelah pesanan WhatsApp dikonfirmasi.

## Migrasi dan foto bersama

Database Vernola sekarang sudah memakai seluruh migration. **Jangan mengulang setup awal untuk klien baru.** Untuk project kosong, urutan historis adalah `001_schema.sql`, `002_vernola_seed.sql`, `004_upgrade.sql`, `005_import_vuyama.sql`, lalu `007_shared_library.sql` dan `008_seed_shared_vuyama.sql`; akun/membership dibuat terpisah. `FINAL-SHARED-LIBRARY.sql` menggabungkan 007 + 008 dan sudah dijalankan pengguna.

Migrasi shared mempertahankan UUID listing, kategori, harga, stok, publikasi dan edit konten lama. Isi lama dibandingkan dengan `catalog/vuyama-baseline.json`; edit menjadi override, bukan ditimpa. File baseline adalah rekaman impor V2, jangan diganti dengan data preview terbaru. Seed rerun tidak menimpa master atau listing yang sudah terhubung.

Foto Vuyama berada satu kali di bucket publik **`vuyama-library/v1/`**: 820 WebP, 2 ukuran per foto (360/960 px), total 24.393.990 byte. Tidak ada folder foto Vuyama dalam deployment setiap klien. Bucket master tidak memiliki kebijakan tulis/hapus client; hanya operator project yang memublikasikan aset. Path berversi dikirim dengan cache satu tahun. Untuk mengganti foto, pakai versi/path baru dan perbarui referensi master; jangan menimpa URL immutable yang sudah di-cache. Pengelola menaikkan revision master dan updated_at saat memperbarui kontennya.

```powershell
npm run assets:optimize
npm run library:prepare
npm run library:publish
```

Optimizer hanya menangani foto Vernola lokal. `library:prepare` (alias lama `catalog:import`) menghasilkan master/seed/preview dan berkas upload dari sumber Sugar Shawl; tidak mengunggah atau menjalankan SQL. Perintah operator ini memerlukan foto sumber pada workspace `../sugarshawl_150_3/public/assets/images`, yang sengaja tidak dimasukkan ke repository Vernola. Hasil master/manifest/preview sudah disertakan; install, test, build dan penggunaan library online tidak memerlukan folder sumber tersebut. Tinjau hasil sebelum menerapkan perubahan. `library:publish` khusus operator, menerima JSON kredensial melalui stdin tersembunyi, mendukung resume, dan tidak menyimpan secret. Jangan membuat ulang upload untuk setiap klien. `.tools/` berisi artefak operator/QA lokal dan tidak boleh masuk deploy.

Bucket `catalog-images` tetap untuk upload milik toko. JPG/PNG/WebP diperkecil dan dikompresi di browser sebelum upload WebP <=1 MB; folder UUID diperiksa membership. Maksimal 8 foto galeri, foto warna terpisah. File bucket publik, termasuk foto draft bila URL diketahui. Cleanup hanya menghapus file toko sendiri yang tidak lagi direferensikan; tidak menyentuh foto master. Tab ditutup paksa dapat meninggalkan file yatim; audit berkala oleh operator.

## Performa dan checkout

Pengukuran online 31 produk: bootstrap dari **3 request / 85.376 byte menjadi 1 request / 43.326 byte**, turun 49,3% sebelum kompresi. Estimasi gzip data 16.298 → 9.540 byte. Detail 82 varian baru diambil saat produknya dibuka. Entry JS pelanggan sekitar **82,7 KB gzip** (React 69,03 + aplikasi 13,71), turun dari 95,5 KB pada V2. Detail, dashboard, SDK Supabase dan picker library tidak di-preload pada route pelanggan. Ini ukuran artefak/data, bukan skor Lighthouse atau janji waktu muat di semua jaringan.

Cache bootstrap 30 detik, detail 60 detik, request bootstrap bersamaan dideduplikasi. Foto responsive/lazy-load, font WOFF2 lokal, dan dimensi gambar mengurangi transfer/pergeseran layout. Build verifier menolak folder supplier yang terduplikasi, referensi foto tidak terdaftar, secret/password pada bundle, dan preload SDK Auth pelanggan.

Nomor awal **081368732131**, disimpan sebagai 6281368732131. Pengaturan toko dapat mengubahnya. Checkout mengambil kontak dan full data terbaru khusus produk dalam tas, lalu memeriksa active, warna, stok, harga dan total. Jika harga berubah, pelanggan memeriksa subtotal baru sebelum melanjutkan. Inquiry tidak dianggap gratis. Tas/favorit disimpan di browser per toko, tanpa alamat pribadi.

WhatsApp membuka draft; tidak mengirim pesan otomatis, mereservasi stok, menerima pembayaran, atau mencatat penjualan. Pengiriman/pembayaran dikonfirmasi admin.

## Klien berikutnya dan deployment

Baca [docs/NEXT-CLIENT.md](docs/NEXT-CLIENT.md). Buat tenant dan akun sendiri pada project yang sama; ubah brand/slug/alias/desain, lalu gunakan picker library untuk memilih Vuyama. Jangan menyalin listing beserta galeri/varian master, akun Vernola, password, .env.local, dist, node_modules, atau .tools.

Vercel untuk repository ini: root directory **`.`** (biarkan default), preset Vite, build `npm run build`, output `dist`, isi tiga VITE variables lalu build. Rewrite `/admin/:path*` tersedia. Perubahan katalog tidak membutuhkan deploy ulang. Belum deploy Vercel pada task ini. Ketentuan plan/kuota tetap perlu dipenuhi; jangan menjanjikan hosting komersial gratis permanen atau kapasitas tanpa batas. Kuota Supabase dipakai bersama seluruh tenant.

## Sumber dan pemeriksaan

Empat contoh Vernola berasal dari folder Drive pengguna. Foto asli `public/assets/product-*.jpg` dipertahankan. Vuyama memakai foto/warna/deskripsi dari `../sugarshawl_150_3/src/data/products.json`, harga dari `retail-prices.json`. Harga pengadaan/reseller tidak diimpor. Logo terbaru hasil koreksi nama berada di `public/assets/novola-fashion.png` dan `novola-logo.webp`; tidak diklaim identik secara piksel dengan sumber. Brief: [docs/FINAL-ENHANCEMENT-BRIEF.md](docs/FINAL-ENHANCEMENT-BRIEF.md).

- `npm test`: 17 pemeriksaan domain, harga retail, aset shared dan override sparse.
- `npm run build`: production build dan verifier bundle/aset.
- `tests/shared-library-local.sql`: uji RLS dan listing/stock terpisah, HANYA PostgreSQL lokal disposable dengan mock Auth/Storage.
- `scripts/test-migration-preservation.mjs`: membuat fixture SQL lokal untuk memeriksa edit lama tidak hilang.
- `scripts/verify-hosted.mjs`: login melalui stdin tersembunyi, membaca library/views/RPC, menguji CRUD/upload/konflik memakai record QA sementara yang dibersihkan; audit tetap disimpan. Jangan mengirim password sebagai argumen shell.
- `scripts/measure-catalog.mjs after`: membaca API publik dan menyimpan hasil payload. Jangan menjalankan mode before setelah migrasi untuk mengukur baseline V2; baseline historis sudah disimpan.
