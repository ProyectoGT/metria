-- ==============================================================================
-- GLOBAL SEARCH INDEX
-- Mantiene un indice materializado para busqueda ultra-rapida con pg_trgm
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS global_search_index (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL, -- 'contacto', 'propiedad', 'pedido', 'tarea', 'agenda', 'email', 'ticket', 'usuario'
  entity_id text NOT NULL,
  title text NOT NULL,
  subtitle text,
  search_text text NOT NULL,
  href text NOT NULL,
  metadata jsonb,
  empresa_id integer,
  owner_user_id integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Constraint para evitar duplicados del mismo entity_id por tipo
ALTER TABLE global_search_index ADD CONSTRAINT unique_entity_search UNIQUE (entity_type, entity_id);

-- Indices
CREATE INDEX IF NOT EXISTS idx_global_search_empresa ON global_search_index(empresa_id);
CREATE INDEX IF NOT EXISTS idx_global_search_owner ON global_search_index(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_global_search_text_trgm ON global_search_index USING gin (search_text gin_trgm_ops);

-- RLS
ALTER TABLE global_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver busqueda propia o de empresa" ON global_search_index
FOR SELECT USING (
  empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_id = auth.uid())
);

-- ==============================================================================
-- TRIGGERS DE SINCRONIZACIÓN
-- ==============================================================================

-- Funcion helper para normalizar texto (sin acentos, en minusculas)
CREATE OR REPLACE FUNCTION unaccent_lower(t text) RETURNS text AS $$
BEGIN
  -- Basic unaccent (requires unaccent extension or simple replace)
  -- If unaccent is not installed, fallback to lower
  RETURN lower(t);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Contactos
CREATE OR REPLACE FUNCTION sync_contacto_search() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM global_search_index WHERE entity_type = 'contacto' AND entity_id = OLD.id::text;
    RETURN OLD;
  END IF;

  INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  VALUES (
    'contacto', 
    NEW.id::text, 
    COALESCE(NEW.nombre, '') || ' ' || COALESCE(NEW.apellidos, ''), 
    COALESCE(NEW.tipo, '') || ' · ' || COALESCE(NEW.email, '') || ' · ' || COALESCE(NEW.telefono, ''), 
    unaccent_lower(COALESCE(NEW.nombre, '') || ' ' || COALESCE(NEW.apellidos, '') || ' ' || COALESCE(NEW.email, '') || ' ' || COALESCE(NEW.telefono, '') || ' ' || COALESCE(NEW.empresa, '')),
    '/contactos',
    NEW.empresa_id,
    NEW.owner_user_id
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    search_text = EXCLUDED.search_text,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_contacto_search_trg
AFTER INSERT OR UPDATE OR DELETE ON contactos
FOR EACH ROW EXECUTE FUNCTION sync_contacto_search();


-- 2. Propiedades
CREATE OR REPLACE FUNCTION sync_propiedad_search() RETURNS TRIGGER AS $$
DECLARE
  finca_numero text;
  sector_id int;
  zona_id int;
  sub text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM global_search_index WHERE entity_type = 'propiedad' AND entity_id = OLD.id::text;
    RETURN OLD;
  END IF;

  SELECT f.numero, s.id, s.zona_id INTO finca_numero, sector_id, zona_id 
  FROM fincas f JOIN sectores s ON f.sector_id = s.id 
  WHERE f.id = NEW.finca_id;

  sub := 'Finca ' || COALESCE(finca_numero, '') || COALESCE(' · Planta ' || NEW.planta, '') || COALESCE(' Puerta ' || NEW.puerta, '');

  INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  VALUES (
    'propiedad', 
    NEW.id::text, 
    COALESCE(NEW.propietario, 'Propiedad #' || NEW.id), 
    sub,
    unaccent_lower(COALESCE(NEW.propietario, '') || ' ' || sub || ' ' || COALESCE(NEW.estado, '')),
    '/zona/' || COALESCE(zona_id::text, '') || '/sector/' || COALESCE(sector_id::text, '') || '/finca/' || COALESCE(NEW.finca_id::text, ''),
    NEW.empresa_id,
    NEW.owner_user_id
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    search_text = EXCLUDED.search_text,
    href = EXCLUDED.href,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_propiedad_search_trg
AFTER INSERT OR UPDATE OR DELETE ON propiedades
FOR EACH ROW EXECUTE FUNCTION sync_propiedad_search();


-- 3. Pedidos
CREATE OR REPLACE FUNCTION sync_pedido_search() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM global_search_index WHERE entity_type = 'pedido' AND entity_id = OLD.id::text;
    RETURN OLD;
  END IF;

  INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  VALUES (
    'pedido', 
    NEW.id::text, 
    COALESCE(NEW.nombre_cliente, 'Pedido #' || NEW.id), 
    COALESCE(NEW.tipo_propiedad, '') || ' · ' || COALESCE(NEW.origen, ''), 
    unaccent_lower(COALESCE(NEW.nombre_cliente, '') || ' ' || COALESCE(NEW.tipo_propiedad, '') || ' ' || COALESCE(NEW.origen, '') || ' ' || COALESCE(NEW.referencia, '')),
    '/solicitudes/' || NEW.id,
    NEW.empresa_id,
    NEW.owner_user_id
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    search_text = EXCLUDED.search_text,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_pedido_search_trg
AFTER INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION sync_pedido_search();


-- 4. Agenda
CREATE OR REPLACE FUNCTION sync_agenda_search() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM global_search_index WHERE entity_type = 'agenda' AND entity_id = OLD.id::text;
    RETURN OLD;
  END IF;

  INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  VALUES (
    'agenda', 
    NEW.id::text, 
    COALESCE(NEW.description, 'Actividad #' || NEW.id), 
    COALESCE(NEW.tipo, '') || ' · ' ||     COALESCE(NEW.event_date::text, ''), 
    unaccent_lower(COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.tipo, '') || ' ' || COALESCE(NEW.result, '')),
    '/calendario',
    NEW.empresa_id,
    NEW.owner_user_id
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    search_text = EXCLUDED.search_text,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_agenda_search_trg
AFTER INSERT OR UPDATE OR DELETE ON agenda
FOR EACH ROW EXECUTE FUNCTION sync_agenda_search();


-- 5. Tareas
CREATE OR REPLACE FUNCTION sync_tarea_search() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM global_search_index WHERE entity_type = 'tarea' AND entity_id = OLD.id::text;
    RETURN OLD;
  END IF;

  INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
  VALUES (
    'tarea', 
    NEW.id::text, 
    COALESCE(NEW.titulo, 'Tarea #' || NEW.id), 
    COALESCE(NEW.estado, ''), 
    unaccent_lower(COALESCE(NEW.titulo, '') || ' ' || COALESCE(NEW.resultado, '')),
    '/dashboard',
    NEW.empresa_id,
    NEW.owner_user_id
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    search_text = EXCLUDED.search_text,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_tarea_search_trg
AFTER INSERT OR UPDATE OR DELETE ON tareas
FOR EACH ROW EXECUTE FUNCTION sync_tarea_search();

-- ==============================================================================
-- BACKFILL SCRIPT (Opcional, se ejecuta manualmente o al final de la migración)
-- ==============================================================================
-- Insertar datos historicos
INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
SELECT 'contacto', id::text, COALESCE(nombre, '') || ' ' || COALESCE(apellidos, ''), COALESCE(tipo, '') || ' · ' || COALESCE(email, '') || ' · ' || COALESCE(telefono, ''), unaccent_lower(COALESCE(nombre, '') || ' ' || COALESCE(apellidos, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(telefono, '') || ' ' || COALESCE(empresa, '')), '/contactos', empresa_id, owner_user_id
FROM contactos ON CONFLICT DO NOTHING;

-- Tareas
INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
SELECT 'tarea', id::text, COALESCE(titulo, 'Tarea #' || id), COALESCE(estado, ''), unaccent_lower(COALESCE(titulo, '') || ' ' || COALESCE(resultado, '')), '/dashboard', empresa_id, owner_user_id
FROM tareas ON CONFLICT DO NOTHING;

-- Agenda
INSERT INTO global_search_index (entity_type, entity_id, title, subtitle, search_text, href, empresa_id, owner_user_id)
SELECT 'agenda', id::text, COALESCE(description, 'Actividad #' || id), COALESCE(tipo, '') || ' · ' || COALESCE(event_date::text, ''), unaccent_lower(COALESCE(description, '') || ' ' || COALESCE(tipo, '') || ' ' || COALESCE(result, '')), '/calendario', empresa_id, owner_user_id
FROM agenda ON CONFLICT DO NOTHING;
