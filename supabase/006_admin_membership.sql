-- Auth account was created via Supabase Admin API with user-approved internal email.
begin;
do $$
declare target_user uuid; target_store uuid;
begin
 select id into target_user from auth.users where lower(email)='vernola@vernola-fashion.admin.invalid';
 select id into target_store from public.stores where slug='vernola-fashion';
 if target_user is null or target_store is null then raise exception 'Akun Auth atau toko Vernola belum tersedia.';end if;
 insert into public.store_members(store_id,user_id) values(target_store,target_user) on conflict do nothing;
end$$;
notify pgrst,'reload schema';
commit;
