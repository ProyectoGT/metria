alter table public.email_accounts
  add column if not exists sync_cursor text,
  add column if not exists full_sync_completed_at timestamptz,
  add column if not exists sync_started_at timestamptz;

alter table public.email_messages
  drop constraint if exists email_messages_folder_check,
  add constraint email_messages_folder_check
    check (folder in ('inbox','sent','archive','trash','spam','drafts'));

create index if not exists email_messages_user_folder_received_id_idx
  on public.email_messages(user_id, folder, coalesce(received_at, sent_at, created_at) desc, id desc);

create index if not exists email_messages_user_labels_idx
  on public.email_messages using gin (raw_metadata);

create index if not exists email_accounts_sync_idx
  on public.email_accounts(user_id, provider, status, full_sync_completed_at, last_sync_at);
