alter table agenda
  add column if not exists tarea_id bigint null references tareas(id) on delete set null;
