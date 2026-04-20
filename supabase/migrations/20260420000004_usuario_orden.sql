create table if not exists usuario_orden (
  id bigint generated always as identity primary key,
  usuario_id integer not null references usuarios(id) on delete cascade,
  tabla text not null,
  item_id integer not null,
  posicion integer not null,
  unique(usuario_id, tabla, item_id)
);
