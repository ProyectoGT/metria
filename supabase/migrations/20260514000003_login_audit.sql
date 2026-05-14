-- ─── Sistema de Auditoría de Accesos ─────────────────────────────────────────
-- login_audit:     registro detallado por cada inicio de sesión correcto
-- device_sessions: dispositivos conocidos por usuario (detección de nuevos)
-- notificaciones:  notificaciones internas para administradores
-- ─────────────────────────────────────────────────────────────────────────────

-- login_audit

create table if not exists public.login_audit (
  id                 bigserial    primary key,
  user_id            bigint       not null references public.usuarios(id) on delete cascade,
  empresa_id         bigint       references public.empresas(id) on delete set null,
  user_name          text         not null,
  user_email         text         not null,
  user_role          text         not null,
  login_at           timestamptz  not null default now(),
  ip_address         text,
  country            text,
  region             text,
  city               text,
  device_type        text,
  os                 text,
  browser            text,
  user_agent         text,
  is_new_device      boolean      not null default false,
  status             text         not null default 'success',
  failure_reason     text,
  device_fingerprint text,
  created_at         timestamptz  not null default now()
);

comment on column public.login_audit.device_type   is 'mobile | tablet | desktop';
comment on column public.login_audit.status        is 'success | failed';

create index if not exists idx_login_audit_user    on public.login_audit(user_id, login_at desc);
create index if not exists idx_login_audit_empresa on public.login_audit(empresa_id, login_at desc);
create index if not exists idx_login_audit_new     on public.login_audit(empresa_id, is_new_device, login_at desc);

alter table public.login_audit enable row level security;

create policy "login_audit_select"
  on public.login_audit for select
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and rol = 'Administrador'
        and estado = 'active'
        and (empresa_id = login_audit.empresa_id or empresa_id is null)
    )
  );

create policy "login_audit_insert"
  on public.login_audit for insert
  with check (true);

-- device_sessions

create table if not exists public.device_sessions (
  id                  bigserial    primary key,
  user_id             bigint       not null references public.usuarios(id) on delete cascade,
  device_fingerprint  text         not null,
  device_type         text,
  os                  text,
  browser             text,
  first_seen_at       timestamptz  not null default now(),
  last_seen_at        timestamptz  not null default now(),
  last_ip             text,
  last_country        text,
  last_city           text,
  trusted             boolean      not null default false,
  unique(user_id, device_fingerprint)
);

alter table public.device_sessions enable row level security;

create policy "device_sessions_select_admin"
  on public.device_sessions for select
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and rol = 'Administrador'
        and estado = 'active'
    )
  );

create policy "device_sessions_insert"
  on public.device_sessions for insert
  with check (true);

create policy "device_sessions_update"
  on public.device_sessions for update
  using (true);

-- notificaciones (admin genéricas: login, sistema, etc.)

create table if not exists public.notificaciones (
  id               bigserial    primary key,
  usuario_id       bigint       not null references public.usuarios(id) on delete cascade,
  empresa_id       bigint       references public.empresas(id) on delete cascade,
  tipo             text         not null,
  titulo           text         not null,
  mensaje          text         not null,
  login_audit_id   bigint       references public.login_audit(id) on delete set null,
  leido            boolean      not null default false,
  leido_at         timestamptz,
  created_at       timestamptz  not null default now()
);

comment on column public.notificaciones.tipo is 'nuevo_login | sistema';

create index if not exists idx_notificaciones_user on public.notificaciones(usuario_id, leido, created_at desc);

alter table public.notificaciones enable row level security;

create policy "notificaciones_select"
  on public.notificaciones for select
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and id = notificaciones.usuario_id
        and estado = 'active'
    )
  );

create policy "notificaciones_insert"
  on public.notificaciones for insert
  with check (true);

create policy "notificaciones_update"
  on public.notificaciones for update
  using (
    exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and id = notificaciones.usuario_id
        and estado = 'active'
    )
  );

notify pgrst, 'reload schema';
