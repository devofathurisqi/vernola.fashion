const image = (n) => `/assets/product-${n}.jpg`;
const base = {
  price: 0,
  price_confirm: true,
  stock: 0,
  stock_confirm: true,
  active: true,
};
export const sample = {
  store: {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "vernola-fashion",
    name: "Vernola.fashion",
    whatsapp: "6281368732131",
    tagline: "Everyday Elegance, Everyday Comfort",
  },
  categories: [
    {
      id: "hijab",
      name: "Hijab",
      description: "Pilihan untuk setiap hari",
      position: 0,
    },
    {
      id: "atasan",
      name: "Atasan",
      description: "Detail yang melengkapi gaya",
      position: 1,
    },
  ],
  products: [
    {
      ...base,
      id: "kanaya",
      name: "Bergo Kanaya S",
      category_id: "hijab",
      description:
        "Bergo Kanaya ukuran S, sesuai foto koleksi. Silakan konfirmasi bahan, harga, dan ketersediaan kepada admin.",
      images: [image(4), image(1), image(2), image(3)],
      has_colors: true,
      variants: [
        { id: "coksu", name: "Coksu–Milo", stock: 0, image: image(1) },
        { id: "aurora", name: "Aurora–Nude", stock: 0, image: image(2) },
        { id: "pewter", name: "BW–Pewter", stock: 0, image: image(3) },
      ],
    },
    {
      ...base,
      id: "alana",
      name: "Bergo Alana S",
      category_id: "hijab",
      description:
        "Bergo Alana ukuran S. Foto warna berasal dari koleksi yang diberikan. Harga dan ketersediaan dikonfirmasi admin.",
      images: [image(10), image(5), image(6), image(7)],
      has_colors: true,
      variants: [
        { id: "misty", name: "Misty", stock: 0, image: image(5) },
        { id: "milo", name: "Milo", stock: 0, image: image(6) },
        { id: "navy", name: "Navy", stock: 0, image: image(7) },
      ],
    },
    {
      ...base,
      id: "bergo-look",
      name: "Inspirasi Bergo",
      category_id: "hijab",
      description:
        "Contoh tampilan bergo dari foto koleksi. Nama model, bahan, ukuran, harga, dan stok menunggu konfirmasi admin.",
      images: [image(9), image(8)],
      has_colors: false,
      variants: [],
    },
    {
      ...base,
      id: "blouse-512352",
      name: "Blouse 512352",
      category_id: "atasan",
      description:
        "Blouse motif polkadot dengan detail renda. Keterangan pada foto: lingkar dada 114 cm, panjang 64 cm, Snowy. Harga dan stok dikonfirmasi admin.",
      images: [image(11), image(12), image(13), image(14)],
      has_colors: true,
      variants: [
        { id: "black", name: "Hitam", stock: 0, image: image(11) },
        { id: "white", name: "Putih", stock: 0, image: image(12) },
      ],
    },
  ],
};
