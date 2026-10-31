import React,{useState,useEffect}from'react';
import{Plus,Minus,Heart,MessageCircle,Check,ShoppingBag,ZoomIn,PackageCheck,LoaderCircle,RefreshCw,Search,X}from'lucide-react';
import{Dialog,Picture,Button,Empty}from'./ui';import{money}from'./lib';import{stockFor}from'./domain';import{loadProduct}from'./catalog';
export default function ProductDialog(props){const card=props.p,[product,setProduct]=useState(card._summary?null:card),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);useEffect(()=>{if(!card._summary)return;let live=true;setError('');loadProduct(card.id,{force:attempt>0,expectedRevision:card.revision,expectedLibraryRevision:card.library_revision}).then(p=>live&&setProduct(p)).catch(e=>live&&setError(e.message));return()=>{live=false}},[card.id,attempt]);if(!product)return <Dialog title={card.name} onClose={props.onClose}><Empty icon={error?RefreshCw:LoaderCircle} title={error?'Koleksi belum dapat dibuka':card.name} text={error||'Menyiapkan detail dan pilihan warnamu…'}>{error&&<Button onClick={()=>setAttempt(n=>n+1)}>Coba lagi</Button>}</Empty></Dialog>;return <LoadedProductDialog {...props} p={product}/>}
function LoadedProductDialog({ p, store, onClose, add, favorite, isFavorite }) {
  const [variant, setVariant] = useState(""),
    [photo, setPhoto] = useState(p.images[0]),
    [qty, setQty] = useState(1),
    [zoom, setZoom] = useState(false),
    [colorQuery, setColorQuery] = useState('');
  const v = p.variants.find((v) => v.id === variant),
    stock = stockFor(p, variant),
    max = p.stock_confirm ? 99 : Math.min(stock, 99),
    choose = p.has_colors && !variant,
    canBuy = !choose && (p.stock_confirm || stock > 0) && p.images.length > 0;
  const photos = [...new Set([...(photo ? [photo] : []), ...p.images])];
  const colors=p.variants.filter(x=>x.name.toLocaleLowerCase('id').includes(colorQuery.trim().toLocaleLowerCase('id')));
  return (
    <Dialog wide title={p.name} onClose={onClose} className="product-dialog">
      <div className="product-detail-v2">
        <div className="detail-gallery">
          <button
            className="main-detail-image"
            onClick={() => photo && setZoom(true)}
            aria-label="Perbesar foto"
          >
            <Picture
              src={photo}
              alt={`${p.name} ${v?.name || ""}`}
              priority
              sizes="(max-width:700px) 90vw, 45vw"
            />
            <span>
              <ZoomIn size={17} />
            </span>
          </button>
          <div className="gallery-thumbs">
            {photos.map((src) => (
              <button
                key={src}
                className={photo === src ? "selected" : ""}
                onClick={() => setPhoto(src)}
                aria-label={`Foto ${photos.indexOf(src) + 1}`}
              >
                <Picture src={src} alt="" sizes="70px" />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="eyebrow">THE VERNOLA COLLECTION</div>
          <h2>{p.name}</h2>
          <div className="detail-price">
            {p.price_confirm ? "Tanyakan harga" : money(p.price)}
          </div>
          <p className="detail-description">{p.description}</p>
          {p.has_colors && (
            <fieldset className="color-field">
              <legend>
                Warna pilihan <strong>{v ? "— " + v.name : ""}</strong>
              </legend>
              {p.variants.length>12&&<><div className="color-search"><Search size={15}/><input aria-label="Cari warna produk" placeholder={`Cari dari ${p.variants.length} pilihan warna…`} value={colorQuery} onChange={e=>setColorQuery(e.target.value)}/>{colorQuery&&<button aria-label="Hapus pencarian warna" onClick={()=>setColorQuery('')}><X size={14}/></button>}</div><p className="color-search-count" role="status">{colors.length} dari {p.variants.length} warna{v?` · Pilihanmu: ${v.name}`:''}</p></>}
              <div className="color-choices">
                {colors.map((x) => (
                  <button
                    key={x.id}
                    className={variant === x.id ? "selected" : ""}
                    aria-pressed={variant === x.id}
                    onClick={() => {
                      setVariant(x.id);
                      setQty(1);
                      setPhoto(x.image || p.images[0]);
                    }}
                  >
                    {/^#[0-9a-f]{6}$/i.test(x.hex || "") && (
                      <i style={{ background: x.hex }} />
                    )}
                    {x.name}
                    {variant === x.id && <Check size={12} />}
                  </button>
                ))}
                {colors.length===0&&<p className="color-no-result">Warna belum ditemukan. Coba nama lainnya.</p>}
              </div>
            </fieldset>
          )}
          <p className="availability">
            <span className={!p.stock_confirm && stock === 0 ? "out" : ""} />
            {p.stock_confirm
              ? "Ketersediaan dikonfirmasi admin"
              : choose
                ? "Pilih warna untuk melihat stok"
                : stock > 0
                  ? `${stock} tersedia`
                  : "Stok habis"}
          </p>
          {p.price_confirm || !p.images.length ? (
            <a
              className="btn full"
              href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Halo Vernola, saya ingin menanyakan harga dan stok ${p.name}${v ? " warna " + v.name : ""}.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Tanyakan kepada admin <MessageCircle size={18} />
            </a>
          ) : (
            <div className="detail-buy">
              <div className="qty-control">
                <button
                  aria-label="Kurangi jumlah"
                  disabled={qty <= 1}
                  onClick={() => setQty((n) => n - 1)}
                >
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  aria-label="Tambah jumlah"
                  disabled={qty >= max}
                  onClick={() => setQty((n) => n + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
              <Button
                disabled={!canBuy || qty > max}
                onClick={() => add(p, v, qty)}
              >
                <ShoppingBag size={17} />
                {choose ? "Pilih warna dahulu" : "Tambah ke tas"}
              </Button>
            </div>
          )}
          <button
            className={`detail-save ${isFavorite ? "saved" : ""}`}
            onClick={favorite}
          >
            <Heart size={16} />
            {isFavorite ? "Tersimpan di favorit" : "Simpan ke favorit"}
          </button>
          <div className="detail-reassurance">
            <PackageCheck size={18} />
            <span>
              Pesan melalui WhatsApp.
              <br />
              Stok, ongkir & pembayaran dikonfirmasi admin.
            </span>
          </div>
          <details>
            <summary>
              Catatan sebelum berbelanja <Plus size={14} />
            </summary>
            <p>
              Warna pada layar dapat berbeda karena pencahayaan dan pengaturan
              perangkat. Tanyakan detail bahan, ukuran, serta ketersediaan
              kepada admin sebelum pembayaran.
            </p>
          </details>
        </div>
      </div>
      {zoom && (
        <Dialog
          title="Foto produk diperbesar"
          onClose={() => setZoom(false)}
          wide
          className="zoom-dialog"
        >
          <Picture src={photo} alt={p.name} priority sizes="90vw" />
        </Dialog>
      )}
    </Dialog>
  );
}
