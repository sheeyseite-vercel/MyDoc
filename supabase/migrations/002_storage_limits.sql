update storage.buckets set file_size_limit=15728640, allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'] where id='documents';
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id) values(new.id); insert into notification_preferences(user_id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
