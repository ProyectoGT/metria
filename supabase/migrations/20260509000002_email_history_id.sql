-- ─── Gmail incremental sync: historyId tracking ────────────────────────────────
-- Añade last_history_id a email_accounts para sincronización incremental.
-- ───────────────────────────────────────────────────────────────────────────────

ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS last_history_id TEXT DEFAULT NULL;

COMMENT ON COLUMN email_accounts.last_history_id IS 'Último historyId de Gmail para sincronización incremental. NULL = pendiente de sync inicial.';
