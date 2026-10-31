-- First: Supabase Dashboard > Authentication > Users > Add user.
-- Create the client's account there. Never commit passwords.
-- Replace the email below, then run in SQL Editor as project owner.
do $$
declare target_user uuid; target_store uuid;
begin
 select id into target_user from auth.users where lower(email)=lower('REPLACE_WITH_CLIENT_EMAIL');
 select id into target_store from public.stores where slug='vernola-fashion';
 if target_user is null or target_store is null then raise exception 'Create the user and seed the store first, then replace the email.'; end if;
 insert into public.store_members(store_id,user_id) values(target_store,target_user) on conflict do nothing;
end $$;
