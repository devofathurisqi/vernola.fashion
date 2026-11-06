import fs from 'node:fs';
const html=fs.readFileSync('dist/index.html','utf8');
const webpWasm=fs.readdirSync('dist/assets').filter(f=>/^webp_enc-.*\.wasm$/.test(f));
if(webpWasm.length!==1||fs.readFileSync('dist/assets/'+webpWasm[0]).subarray(0,4).toString('hex')!=='0061736d')throw Error('Bundled Safari WebP encoder missing/invalid');

if(/sb_secret_/.test(html))throw Error('Secret in HTML');
if(html.includes('supabase-'))throw Error('Auth SDK preloaded on customer route');
for(const f of fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'))){
 const code=fs.readFileSync('dist/assets/'+f,'utf8');
 if(/sb_secret_[A-Za-z0-9_-]+|(?:adminvernola|novolaadmin)\d+/i.test(code))throw Error('Credential in bundle');
}
const manifest=JSON.parse(fs.readFileSync('src/local-image-manifest.json'));
for(const[src,m]of Object.entries(manifest))for(const p of [src,m.src,...m.srcset.split(', ').filter(Boolean).map(x=>x.split(' ')[0])])if(!fs.existsSync('dist'+p))throw Error('Missing built asset '+p);
if(fs.existsSync('dist/assets/vuyama'))throw Error('Shared Vuyama assets must not be duplicated in each deployment');
const shared=JSON.parse(fs.readFileSync('catalog/shared-assets.json')),paths=new Set(shared.files.map(f=>f.path)),library=JSON.parse(fs.readFileSync('catalog/library-products.json'));
for(const p of library)for(const src of [...p.images,...p.variants.map(v=>v.image)].filter(Boolean)){
 const parts=new URL(src).pathname.split('/'+shared.bucket+'/');
 if(parts.length!==2||!paths.has(parts[1])||!paths.has(parts[1].replace(/\.webp$/,'-360.webp')))throw Error('Unregistered shared image '+src);
}
if(/procurement|supplierCost|resellerCost|purchasePrice/.test(fs.readFileSync('src/vuyama.json','utf8')))throw Error('Internal procurement data imported');
console.log(JSON.stringify({passed:true,localResponsiveImages:Object.keys(manifest).length,sharedProducts:library.length,sharedFiles:paths.size,duplicatedSupplierAssets:false,authSdkExcludedFromEntryPreload:true,credentialsInBundle:false}));
