create table profiles(id uuid primary key references auth.users on delete cascade,display_name text,locale text default 'ar',theme text default 'light',ai_consent boolean default false,created_at timestamptz default now(),updated_at timestamptz default now());
create table folders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,parent_id uuid references folders on delete set null,name text not null,created_at timestamptz default now(),updated_at timestamptz default now());
create table documents(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,folder_id uuid references folders on delete set null,title text not null,category text,issuer text,owner_name text,issue_date date,expiry_date date,reference_no text,notes text,storage_path text not null,mime text not null,size_bytes bigint not null,status text not null default 'uploaded' check(status in('uploaded','processing','ready','failed')),is_favorite boolean default false,archived_at timestamptz,deleted_at timestamptz,ocr_text text,created_at timestamptz default now(),updated_at timestamptz default now(),
search tsvector generated always as (to_tsvector('simple',coalesce(title,'')||' '||coalesce(category,'')||' '||coalesce(issuer,'')||' '||coalesce(owner_name,'')||' '||coalesce(notes,'')||' '||coalesce(ocr_text,''))) stored);
create index documents_search_idx on documents using gin(search);
create index documents_user_idx on documents(user_id,expiry_date);
create table tags(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,name text not null,unique(user_id,name));
create table document_tags(document_id uuid references documents on delete cascade,tag_id uuid references tags on delete cascade,user_id uuid not null references auth.users on delete cascade,primary key(document_id,tag_id));
create table document_extracted_fields(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,document_id uuid not null references documents on delete cascade,field text not null,value text,confirmed boolean default false,created_at timestamptz default now());
create table reminders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,document_id uuid not null references documents on delete cascade,days_before int not null,remind_at timestamptz not null,sent_at timestamptz,created_at timestamptz default now());
create table ai_conversations(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,title text,created_at timestamptz default now(),updated_at timestamptz default now());
create table ai_messages(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,conversation_id uuid not null references ai_conversations on delete cascade,role text not null check(role in('user','assistant')),content text not null,created_at timestamptz default now());
create table ai_provider_settings(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,provider text not null,model text not null,priority int not null default 0,enabled boolean default true,created_at timestamptz default now());
create table ai_usage_logs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,provider text,model text,status text,error_kind text,created_at timestamptz default now());
create table activity_logs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,action text not null,document_id uuid,created_at timestamptz default now());
create table notification_preferences(user_id uuid primary key references auth.users on delete cascade,days_before int[] default '{90,30,7,1}',push_enabled boolean default false,timezone text default 'UTC');
do $$ declare t text; begin
foreach t in array array['folders','documents','tags','document_tags','document_extracted_fields','reminders','ai_conversations','ai_messages','ai_provider_settings','ai_usage_logs','activity_logs','notification_preferences'] loop
execute format('alter table %I enable row level security',t);
execute format('create policy own_%I on %I for all using(auth.uid()=user_id) with check(auth.uid()=user_id)',t,t);
end loop; end $$;
alter table profiles enable row level security;
create policy own_profiles on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
insert into storage.buckets(id,name,public) values('documents','documents',false);
create policy own_files on storage.objects for all using(bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
