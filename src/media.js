import manifest from './local-image-manifest.json';
const sharedMarker='/storage/v1/object/public/vuyama-library/';
export function imageSource(src){
 if(src?.startsWith('/assets/vuyama/')){const base=import.meta.env.VITE_SUPABASE_URL;if(base)src=base+'/storage/v1/object/public/vuyama-library/v1/'+src.slice('/assets/vuyama/'.length);}
 if(src?.includes(sharedMarker)&&src.endsWith('.webp')&&!src.endsWith('-360.webp'))return {src,srcset:`${src.replace(/\.webp$/,'-360.webp')} 360w, ${src} 960w`,width:960,height:1200};
 return manifest[src];
}
