-- Sugerencias automáticas de cambio de estado del pipeline inmobiliario.
-- El sistema genera sugerencias basadas en actividad; los agentes las aceptan o rechazan.
-- No se modifica ningún estado sin acción explícita del usuario.

create table if not exists public.pipeline_state_suggestions (
  id bigserial primary key,
  empresa_id bigint references public.empresas (id) on delete cascade,

  -- Sujeto de la sugerencia: propiedad o pedido (exactamente uno)
  propiedad_id bigint references public.propiedades (id) on delete cascade,
  pedido_id    bigint references public.pedidos (id) on delete cascade,

  -- Agente responsable (puede ser null si se genera por sistema)
  agente_id bigint references public.usuarios (id) on delete set null,

  -- Estado actual en el momento de generar la sugerencia
  estado_actual text not null,
  -- Estado sugerido
  estado_sugerido text not null,

  -- Tipo de regla que activó la sugerencia
  -- pedido_frio | visita_agendada | propiedad_sin_actividad | encargo_firmado | oportunidad_activa
  tipo_regla varchar(60) not null,

  -- Explicación legible del motivo
  razon text not null,

  -- dias_sin_actividad o contexto numérico relevante
  dias_sin_actividad integer,

  -- Estado del ciclo de vida de la sugerencia
  -- pendiente | aceptada | rechazada | expirada
  status varchar(20) not null default 'pendiente',

  -- Fechas de resolución
  resuelta_at timestamptz,
  resuelta_por bigint references public.usuarios (id) on delete set null,

  created_at timestamptz not null default now(),

  constraint pipeline_suggestion_subject_check check (
    propiedad_id is not null or pedido_id is not null
  ),
  constraint pipeline_suggestion_status_check check (
    status in ('pendiente', 'aceptada', 'rechazada', 'expirada')
  )
);

create index if not exists idx_pipeline_suggestions_empresa_status
  on public.pipeline_state_suggestions (empresa_id, status, created_at desc);

create index if not exists idx_pipeline_suggestions_propiedad
  on public.pipeline_state_suggestions (propiedad_id)
  where propiedad_id is not null;

create index if not exists idx_pipeline_suggestions_pedido
  on public.pipeline_state_suggestions (pedido_id)
  where pedido_id is not null;

create index if not exists idx_pipeline_suggestions_agente
  on public.pipeline_state_suggestions (agente_id, status);

-- Trigger: rellena empresa_id y agente_id si no se pasan
create or replace function public.apply_pipeline_suggestion_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null then
    new.empresa_id := public.current_empresa_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pipeline_suggestion_defaults on public.pipeline_state_suggestions;
create trigger trg_pipeline_suggestion_defaults
before insert on public.pipeline_state_suggestions
for each row execute function public.apply_pipeline_suggestion_defaults();

-- Función para marcar como expiradas las sugerencias pendientes de más de 30 días
create or replace function public.expire_old_pipeline_suggestions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.pipeline_state_suggestions
  set status = 'expirada', resuelta_at = now()
  where status = 'pendiente'
    and created_at < now() - interval '30 days';
$$;

-- RLS
alter table public.pipeline_state_suggestions enable row level security;

create or replace function public.can_access_pipeline_suggestion(
  row_empresa_id bigint,
  row_agente_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when row_empresa_id is distinct from public.current_empresa_id() then false
    when public.current_user_role() in ('Administrador', 'Director') then true
    when row_agente_id = public.current_usuario_id() then true
    when public.current_user_role() = 'Responsable'
      and (
        row_agente_id = public.current_usuario_id()
        or row_agente_id in (select * from public.get_supervised_user_ids())
      ) then true
    else false
  end
$$;

drop policy if exists pipeline_suggestion_select on public.pipeline_state_suggestions;
create policy pipeline_suggestion_select
on public.pipeline_state_suggestions
for select
using (public.can_access_pipeline_suggestion(empresa_id, agente_id));

drop policy if exists pipeline_suggestion_insert on public.pipeline_state_suggestions;
create policy pipeline_suggestion_insert
on public.pipeline_state_suggestions
for insert
with check (
  auth.uid() is not null
  and empresa_id = public.current_empresa_id()
);

drop policy if exists pipeline_suggestion_update on public.pipeline_state_suggestions;
create policy pipeline_suggestion_update
on public.pipeline_state_suggestions
for update
using (public.can_access_pipeline_suggestion(empresa_id, agente_id))
with check (empresa_id = public.current_empresa_id());

notify pgrst, 'reload schema';
