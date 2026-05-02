-- La app gestiona la creación de perfiles manualmente desde el panel de
-- administración. El trigger automático de Supabase (handle_new_user) falla
-- porque 'nombre' y 'apellidos' son NOT NULL en la tabla usuarios.
-- Se elimina el trigger y la función si existen.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
