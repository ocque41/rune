-- Create user_secrets table
create table if not exists public.user_secrets (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    value text not null, -- Stores encrypted value
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    
    constraint user_secrets_pkey primary key (id),
    constraint user_secrets_user_id_name_key unique (user_id, name)
);

-- Enable RLS
alter table public.user_secrets enable row level security;

-- RLS Policies
create policy "Users can view their own secrets"
    on public.user_secrets for select
    using (auth.uid() = user_id);

create policy "Users can create their own secrets"
    on public.user_secrets for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own secrets"
    on public.user_secrets for update
    using (auth.uid() = user_id);

create policy "Users can delete their own secrets"
    on public.user_secrets for delete
    using (auth.uid() = user_id);
