alter table public.agenda
  add column if not exists google_calendar_id text,
  add column if not exists sync_status text not null default 'local',
  add column if not exists sync_error text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists timezone text not null default 'Europe/Madrid';

create index if not exists idx_agenda_google_calendar_id
  on public.agenda (google_calendar_id)
  where google_calendar_id is not null;

create index if not exists idx_agenda_sync_status
  on public.agenda (sync_status);

create index if not exists idx_agenda_event_date_user
  on public.agenda (event_date, user_id)
  where archived_at is null;

notify pgrst, 'reload schema';
