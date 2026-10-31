import{sample}from'./sample';import vuyama from'./vuyama.json';
export const previewData={store:sample.store,categories:[...sample.categories,...vuyama.categories],products:[...sample.products,...vuyama.products].map((p,i)=>({...p,sku:p.sku||`VRN-${String(i+1).padStart(3,'0')}`,revision:1,created_at:new Date(1793448000000-i*100000).toISOString(),featured:p.featured||i===0}))};
