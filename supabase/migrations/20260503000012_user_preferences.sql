create table if not exists public.user_preferences (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id) on delete cascade,
  user_id bigint not null references public.usuarios(id) on delete cascade,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_check check (theme in ('light','dark','dark-black')),
  constraint user_preferences_user_unique unique (user_id)
);

create index if not exists user_preferences_empresa_user_idx
  on public.user_preferences(empresa_id, user_id);

create or replace function public.set_user_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences for select
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences for insert
with check (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences for update
using (
  auth.uid() is not null
  and user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
)
with check (
  user_id = public.current_user_id()
  and empresa_id = public.current_empresa_id()
);
