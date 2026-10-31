import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..'),assets=path.join(root,'public/assets'),manifest={};
// Resizing/encoding only: retain authentic image content and original source files.
for(let i=1;i<=14;i++){const file=path.join(assets,`product-${i}.jpg`),meta=await sharp(file).metadata(),set=[];for(const w of [400,800,1200]){if(w>meta.width&&w!==400)continue;const name=`product-${i}-${w}.webp`;await sharp(file).rotate().resize({width:w,withoutEnlargement:true}).webp({quality:83}).toFile(path.join(assets,name));set.push(`/assets/${name} ${Math.min(w,meta.width)}w`)}manifest[`/assets/product-${i}.jpg`]={src:`/assets/product-${i}-800.webp`,srcset:set.join(', '),width:meta.width,height:meta.height};}
await sharp(path.join(assets,'vernola-fashion.png')).resize({width:620}).webp({quality:90}).toFile(path.join(assets,'vernola-logo.webp'));
fs.writeFileSync(path.join(root,'src/local-image-manifest.json'),JSON.stringify(manifest));console.log(`Local responsive manifest: ${Object.keys(manifest).length} images. Shared Vuyama assets are prepared separately.`);
