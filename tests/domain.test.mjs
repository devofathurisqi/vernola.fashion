import test from 'node:test';import assert from 'node:assert/strict';
import{validateProduct,stockFor,orderMessage}from'../src/domain.js';
const p={name:'Hijab',price:45000,stock:3,has_colors:false,variants:[]};
test('negative, fractional and unsafe prices/stocks are rejected',()=>{for(const v of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){assert.throws(()=>validateProduct({...p,price:v}));assert.throws(()=>validateProduct({...p,stock:v}));}});
test('color mode requires nonempty unique valid variants',()=>{assert.throws(()=>validateProduct({...p,has_colors:true}));assert.throws(()=>validateProduct({...p,has_colors:true,variants:[{name:'Milo',stock:1},{name:' milo ',stock:2}]}));assert.throws(()=>validateProduct({...p,has_colors:true,variants:[{name:'Milo',stock:-1}]}));});
test('disabling colors clears stale variants; single stock survives',()=>{assert.deepEqual(validateProduct({...p,variants:[{name:'Milo',stock:10}]}).variants,[]);assert.equal(stockFor(p),3)});
test('color stock is read per variant, never from aggregate',()=>{const v={...p,has_colors:true,variants:[{id:'m',name:'Milo',stock:2}]};assert.equal(stockFor(v,'m'),2);assert.equal(stockFor(v,'bad'),0)});
test('WhatsApp draft includes quantities, selected color, totals and confirmation',()=>{const s=orderMessage([{name:'Hijab',color:'Milo',qty:2,price:45000},{name:'Blouse',qty:1,price:100000}]);assert.match(s,/1\. \*Hijab\*\n   Warna: Milo\n   Jumlah: 2 pcs/);assert.match(s,/Subtotal produk: Rp190\.000/);assert.match(s,/konfirmasi stok, ongkir/)});
