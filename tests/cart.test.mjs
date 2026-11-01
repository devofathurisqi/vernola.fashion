import test from 'node:test';
import assert from 'node:assert/strict';
import { orderMessage, orderTotals, prepareOrder } from '../src/domain.js';

const hijab = { id: 'hijab', name: 'Bergo Kanaya S', active: true, price: 45000, price_confirm: false, stock_confirm: true, has_colors: true, variants: [{ id: 'milo', name: 'Milo', stock: 0 }, { id: 'nude', name: 'Nude', stock: 0 }] };
const blouse = { id: 'blouse', name: 'Blouse 512352', active: true, price: 0, price_confirm: true, stock_confirm: true, has_colors: false, variants: [] };
const cart = [
  { id: 'hijab', variant_id: 'milo', name: hijab.name, color: 'Milo', qty: 2, price: 45000 },
  { id: 'hijab', variant_id: 'nude', name: hijab.name, color: 'Nude', qty: 1, price: 45000 },
  { id: 'blouse', variant_id: '', name: blouse.name, qty: 3, price: 0, price_confirm: true },
];

test('checkout retains every product, separate colors and quantities, including inquiry prices', () => {
  const result = prepareOrder(cart, [hijab, blouse]);
  assert.equal(result.pricesChanged, false);
  assert.equal(result.lines.length, 3);
  assert.deepEqual(result.lines.map(l => [l.id, l.color, l.qty, l.price_confirm]), [
    ['hijab', 'Milo', 2, false], ['hijab', 'Nude', 1, false], ['blouse', '', 3, true],
  ]);
  assert.deepEqual(orderTotals(result.lines), { total: 135000, quantity: 6, unconfirmed: 1 });
});

test('mixed-price WhatsApp draft lists all cart lines and notes without treating inquiries as free', () => {
  const message = orderMessage(prepareOrder(cart, [hijab, blouse]).lines, { notes: '  Kirim ke Bandung\nWarna & bahan?  ' });
  assert.equal(message, [
    'Halo Novola.fashion, saya ingin konfirmasi pesanan:',
    '*RINCIAN PESANAN*\n1. *Bergo Kanaya S*\n   Warna: Milo\n   Jumlah: 2 pcs\n   Harga satuan: Rp45.000\n   Subtotal: Rp90.000',
    '2. *Bergo Kanaya S*\n   Warna: Nude\n   Jumlah: 1 pcs\n   Harga satuan: Rp45.000\n   Subtotal: Rp45.000',
    '3. *Blouse 512352*\n   Jumlah: 3 pcs\n   Harga satuan: Menunggu konfirmasi admin\n   Subtotal: Menunggu konfirmasi admin',
    '*RINGKASAN*\nTotal: 6 pcs (3 pilihan)\nSubtotal harga tersedia: Rp135.000\n1 pilihan produk menunggu konfirmasi harga.',
    '*CATATAN*\nKirim ke Bandung\nWarna & bahan?',
    'Belum termasuk ongkir. Mohon konfirmasi stok, ongkir, dan total pembayaran.',
  ].join('\n\n'));
  assert.doesNotMatch(message, /Rp0\b/);
  const url = new URL(`https://wa.me/6281368732131?text=${encodeURIComponent(message)}`);
  assert.equal(url.searchParams.get('text'), message);
});

test('all inquiry products have an explicit pending subtotal instead of zero', () => {
  const lines = cart.map(l => ({ ...l, price: 0, price_confirm: true }));
  const message = orderMessage(lines);
  assert.match(message, /Subtotal produk: Menunggu konfirmasi admin/);
  assert.match(message, /3 pilihan produk menunggu konfirmasi harga/);
  assert.doesNotMatch(message, /Rp0\b|\*CATATAN\*/);
});

test('checkout refreshes product names, colors, prices and inquiry status before confirmation', () => {
  const updated = { ...hijab, name: 'Kanaya Terbaru', price: 50000, variants: [{ id: 'milo', name: 'Coksu–Milo', stock: 0 }, ...hijab.variants.slice(1)] };
  const result = prepareOrder(cart, [updated, { ...blouse, price: 100000, price_confirm: false }]);
  assert.equal(result.pricesChanged, true);
  assert.equal(result.lines[0].name, 'Kanaya Terbaru');
  assert.equal(result.lines[0].color, 'Coksu–Milo');
  assert.equal(result.lines[2].price_confirm, false);
  assert.equal(orderTotals(result.lines).total, 450000);
  assert.equal(prepareOrder(result.lines, [updated, { ...blouse, price: 100000, price_confirm: false }]).pricesChanged, false);
  assert.equal(prepareOrder([cart[0]], [{ ...hijab, price_confirm: true }]).pricesChanged, true);
});

test('checkout blocks removed, inactive, changed variants, insufficient stock and empty carts', () => {
  assert.throws(() => prepareOrder([], [hijab]), /kosong/);
  assert.throws(() => orderMessage([]), /kosong/);
  assert.throws(() => prepareOrder(cart, [hijab]), /tidak tersedia/);
  assert.throws(() => prepareOrder(cart, [{ ...hijab, active: false }, blouse]), /tidak tersedia/);
  assert.throws(() => prepareOrder(cart, [{ ...hijab, variants: [] }, blouse]), /telah berubah/);
  assert.throws(() => prepareOrder(cart, [{ ...hijab, has_colors: false }, blouse]), /telah berubah/);
  assert.throws(() => prepareOrder(cart, [{ ...hijab, stock_confirm: false, variants: [{ id: 'milo', name: 'Milo', stock: 1 }, ...hijab.variants.slice(1)] }, blouse]), /tidak mencukupi/);
});
