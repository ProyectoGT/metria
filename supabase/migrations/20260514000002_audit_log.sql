-- ─── Audit Log ──────────────────────────────────────────────────────────────
-- Registro centralizado de cambios importantes para trazabilidad, soporte
-- y control interno.
--
-- Eventos registrados:
--   tarea.creada / tarea.editada / tarea.completada / tarea.eliminada
--   agenda.creada / agenda.editada / agenda.completada / agenda.archivada
--   propiedad.editada / contacto.editado
--   usuario.creado / usuario.editado
--   permiso.cambiado / sesion.iniciada / sesion.cerrada
--
-- Multi-tenant via empresa_id. RLS: usuarios ven logs de su misma empresa.
-- Los inserts se hacen via service_role (admin client) desde server actions.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_log (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    bigint      references public.empresas(id) on delete set null,
  actor_id      bigint      references public.usuarios(id) on delete set null,
  action        text        not null,
  entity_type   text        not null,
  entity_id     text,
  before        jsonb,
  after         jsonb,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

comment on column public.audit_log.action is
  'Nombre de la accion. Formato: "entidad.accion" (ej: tarea.creada, agenda.editada)';

comment on column public.audit_log.entity_type is
  'Tipo de entidad: tarea, agenda, propiedad, contacto, usuario, permiso, sesion';

comment on column public.audit_log.entity_id is
  'ID de la entidad como texto (soporta UUIDs y enteros)';

comment on column public.audit_log.before is
  'Snapshot del estado previo (solo campos relevantes, sin datos sensibles)';

comment on column public.audit_log.after is
  'Snapshot del estado posterior (solo campos relevantes, sin datos sensibles)';

comment on column public.audit_log.metadata is
  'Contexto adicional: ip, user_agent, razon, origen, etc.';

-- Indices

create index if not exists idx_audit_log_created
  on public.audit_log(created_at desc);

create index if not exists idx_audit_log_entity
  on public.audit_log(entity_type, entity_id, created_at desc);

create index if not exists idx_audit_log_actor
  on public.audit_log(actor_id, created_at desc);

create index if not exists idx_audit_log_action
  on public.audit_log(action, created_at desc);

create index if not exists idx_audit_log_empresa
  on public.audit_log(empresa_id, created_at desc);

-- RLS

alter table public.audit_log enable row level security;

create policy "audit_log_select"
  on public.audit_log for select
  using (
    empresa_id is null
    or exists (
      select 1 from public.usuarios
      where auth_id = auth.uid()
        and (
          empresa_id = audit_log.empresa_id
          or rol = 'Administrador'
        )
        and estado = 'active'
    )
  );

create policy "audit_log_insert"
  on public.audit_log for insert
  with check (true);

notify pgrst, 'reload schema';
