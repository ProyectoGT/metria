-- User-managed devices for "Mis dispositivos".
-- Extends the existing login audit device_sessions table without changing the
-- administrative login_audit screen.

alter table public.device_sessions
  add column if not exists alias text,
  add column if not exists user_agent text,
  add column if not exists trusted_at timestamptz,
  add column if not exists trusted_by bigint references public.usuarios(id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by bigint references public.usuarios(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.device_sessions.alias is 'User-defined label for this device.';
comment on column public.device_sessions.trusted is 'Legacy boolean trust flag kept in sync with trusted_at.';
comment on column public.device_sessions.trusted_at is 'When the user marked this device as trusted.';
comment on column public.device_sessions.revoked_at is 'Soft revocation marker. Real session revocation can be integrated later.';

create index if not exists idx_device_sessions_user_last_seen
  on public.device_sessions(user_id, last_seen_at desc);

create index if not exists idx_device_sessions_fingerprint
  on public.device_sessions(device_fingerprint);

create index if not exists idx_device_sessions_trusted
  on public.device_sessions(user_id, trusted_at)
  where trusted_at is not null;

create or replace function public.touch_device_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.trusted = new.trusted_at is not null;
  return new;
end;
$$;

drop trigger if exists trg_device_sessions_updated_at on public.device_sessions;
create trigger trg_device_sessions_updated_at
before update on public.device_sessions
for each row execute function public.touch_device_sessions_updated_at();

-- Replace the broad legacy policies with scoped policies that preserve the
-- admin audit use case and allow users to manage only their own devices.
drop policy if exists "device_sessions_select_admin" on public.device_sessions;
drop policy if exists "device_sessions_select_own_or_admin" on public.device_sessions;
create policy "device_sessions_select_own_or_admin"
  on public.device_sessions for select
  using (
    user_id = public.current_usuario_id()
    or public.current_user_role() = 'Administrador'
  );

drop policy if exists "device_sessions_insert" on public.device_sessions;
create policy "device_sessions_insert"
  on public.device_sessions for insert
  with check (
    user_id = public.current_usuario_id()
    or public.current_user_role() = 'Administrador'
  );

drop policy if exists "device_sessions_update" on public.device_sessions;
drop policy if exists "device_sessions_update_own_or_admin" on public.device_sessions;
create policy "device_sessions_update_own_or_admin"
  on public.device_sessions for update
  using (
    user_id = public.current_usuario_id()
    or public.current_user_role() = 'Administrador'
  )
  with check (
    user_id = public.current_usuario_id()
    or public.current_user_role() = 'Administrador'
  );

notify pgrst, 'reload schema';
