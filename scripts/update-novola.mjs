// One-time authorized brand/account update. Passwords arrive only via hidden stdin.
// The existing tenant slug and Auth email remain stable so deployed env stays valid.
import fs from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const env=Object.fromEntries((await fs.readFile('.env.local','utf8')).replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function checked(r,label){if(r.error)throw Error(label+': '+r.error.message);return r.data;}
async function run(input){
 let login=await db.auth.signInWithPassword({email:'vernola@vernola-fashion.admin.invalid',password:input.currentPassword});
 if(login.error)login=await db.auth.signInWithPassword({email:'vernola@vernola-fashion.admin.invalid',password:input.newPassword});
 const user=checked(login,'login').user;
 const store=checked(await db.from('stores').select('*').eq('slug','vernola-fashion').single(),'store');
 if(store.id!=='00000000-0000-4000-8000-000000000001')throw Error('Unexpected tenant; aborting.');
 checked(await db.from('store_members').select('user_id').eq('store_id',store.id).eq('user_id',user.id).single(),'membership');
 const masters=checked(await db.from('catalog_library_products').select('id').eq('supplier','vuyama'),'shared masters'),ids=new Set(masters.map(p=>p.id));
 const all=checked(await db.from('products').select('*').eq('store_id',store.id),'own listings');
 const removing=all.filter(p=>ids.has(p.library_product_id)||p.source_key?.startsWith('vuyama:'));
 await fs.mkdir('.tools/backups',{recursive:true});
 const backup='.tools/backups/novola-before-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 await fs.writeFile(backup,JSON.stringify({store,products:removing},null,2));
 checked(await db.from('stores').update({name:'Novola.fashion'}).eq('id',store.id).select('id,name').single(),'brand update');
 if(removing.length){const deleted=checked(await db.from('products').delete().eq('store_id',store.id).in('id',removing.map(p=>p.id)).select('id'),'remove own Vuyama listings');if(deleted.length!==removing.length)throw Error('Some selected listings were not deleted.');}
 checked(await db.auth.updateUser({password:input.newPassword,data:{username:'novola'}}),'admin account update');
 await db.auth.signOut();
 checked(await db.auth.signInWithPassword({email:'vernola@vernola-fashion.admin.invalid',password:input.newPassword}),'new password verification');
 const live=checked(await db.rpc('get_catalog_context',{p_slug:store.slug,p_admin:true}),'updated context');
 const remainingMasters=checked(await db.from('catalog_library_products').select('id').eq('supplier','vuyama'),'preserved masters');
 if(live.store.name!=='Novola.fashion'||live.products.some(p=>ids.has(p.library_product_id)))throw Error('Final catalog verification failed.');
 console.log(JSON.stringify({ok:true,brand:live.store.name,username:'novola',passwordVerified:true,removedVuyamaListings:removing.length,remainingStoreProducts:live.products.length,preservedSharedMasters:remainingMasters.length,backup,sqlRequired:false}));
 await db.auth.signOut();
}
process.stdin.setEncoding('utf8');if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hidden account-update JSON on stdin.');let input='',started=false;
process.stdin.on('data',async chunk=>{if(chunk.includes('\u0003'))process.exit(130);input+=chunk;if(started||!/[\r\n]/.test(input))return;started=true;process.stdin.pause();try{const args=JSON.parse(input.trim());input='';await run(args);process.exitCode=0}catch(e){console.log(JSON.stringify({ok:false,error:e.message}));process.exitCode=1}finally{if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.destroy();process.stdin.unref?.();setTimeout(()=>process.exit(process.exitCode||0),200);}});
