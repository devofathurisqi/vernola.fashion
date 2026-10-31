// Canonical comparisons keep inherited content out of each store listing.
const stable=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const sameValue=(a,b)=>stable(a)===stable(b);
export function buildLibraryOverrides(product,master){
 const patch={};for(const key of ['name','description','images','has_colors'])if(!sameValue(product[key],master[key]))patch[key]=product[key];
 const current=product.has_colors?product.variants:[],base=master.variants;
 if(!sameValue(current.map(v=>v.id),base.map(v=>v.id)))patch.variants=current;
 else {const delta={};current.forEach((v,i)=>{const changed={};for(const key of ['name','stock','image','hex'])if(!sameValue(v[key]??(key==='stock'?0:''),base[i][key]??(key==='stock'?0:'')))changed[key]=v[key];if(Object.keys(changed).length)delta[v.id]=changed;});if(Object.keys(delta).length)patch.variant_overrides=delta;}
 return patch;
}
export function cardProduct(p){return {...p,_summary:true};}
export const variantCount=p=>p.variant_count??p.variants?.length??0;
