# Upload Safari/WebP - 6 November 2026

Penyebab: versi sebelumnya menolak Blob PNG ketika browser tidak memiliki encoder WebP. Menggunakan API canvas saja tidak membuktikan browser bisa membuat WebP. Fallback libwebp yang dibundel kini menghasilkan file WebP asli tanpa melebarkan izin bucket atau meminta klien kompres/mengganti browser.

- 37 unit test lulus; total empat aplikasi 155. Empat regresi baru meliputi output native PNG, null/exception, native fast path dan retry.
- Production build serta verifier aset/credential leakage lulus. Build memastikan binary WASM valid hadir dan kode encoder tidak masuk preload pelanggan.
- Modul engine dan codec WASM identik di empat aplikasi. Tabel adalah suite browser bersama yang dijalankan dari Bunave; tidak mengklaim upload produksi pada toko lain.
- WebKit build Windows mampu meng-encode WebP native. Uji portable sengaja menonaktifkan encoder WebP/Worker/OffscreenCanvas/createImageBitmap agar jalur iPhone yang dilaporkan benar-benar memakai HTML Image + WASM, bukan sekadar mengganti user agent. Worker produksi juga diuji dengan native PNG. Tidak ada iPhone fisik pada pengujian ini.

| Kasus | Input byte | Output byte | Dimensi | Request WASM |
| --- | ---: | ---: | --- | ---: |
| webkit-mobile | 235454 | 173054 | 720 x 1280 | 0 |
| webkit-mobile-portable | 235454 | 173318 | 720 x 1280 | 2 |
| webkit-retry | 235454 | 173318 | 720 x 1280 | 3 |
| portable-large-photo.png | 60099219 | 170688 | 2048 x 1638 | 2 |
| portable-80mp-photo.jpg | 4945734 | 171318 | 2048 x 1638 | 2 |
| portable-transparent.png | 80338 | 4994 | 2048 x 1365 | 2 |
| chrome-desktop | 235454 | 173054 | 720 x 1280 | 0 |
| chrome-android | 235454 | 173054 | 720 x 1280 | 0 |
| chrome-worker-portable | 235454 | 173318 | 720 x 1280 | 1 |
| portable-complex-noise.png | 14545753 | 924826 | 1141 x 1141 | 2 |

Foto klien 720 x 1280 tetap beresolusi sama: native 173.054 byte, portable 173.318 byte; PSNR 41,41 dB terhadap sumber. Ini pengukuran sampel, bukan jaminan semua foto. Output portable memuat transparansi dan tidak mengubah rasio foto. Gambar acak melampaui budget awal dikecilkan otomatis tanpa menurunkan kualitas di bawah 82. Kegagalan download WASM dapat diulang pada sesi yang sama.

Suite codec tidak menulis Storage/produk produksi. Verifikasi upload dan penyimpanan nyata Saliha Dress pada akun Bunave dilakukan terpisah setelah deployment sesuai instruksi pemilik; kata sandi tidak ditulis di repository, env VITE, QA atau bundle.
