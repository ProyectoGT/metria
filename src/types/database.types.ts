export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      actividad_desarrollo: {
        Row: {
          action: string
          actor_user_id: number | null
          agente_id: number
          empresa_id: number | null
          equipo_id: number | null
          id: number
          metadata: Json
          metric: string
          occurred_at: string
          source_id: number
          source_table: string
          value: number
        }
        Insert: {
          action: string
          actor_user_id?: number | null
          agente_id: number
          empresa_id?: number | null
          equipo_id?: number | null
          id?: number
          metadata?: Json
          metric: string
          occurred_at?: string
          source_id: number
          source_table: string
          value?: number
        }
        Update: {
          action?: string
          actor_user_id?: number | null
          agente_id?: number
          empresa_id?: number | null
          equipo_id?: number | null
          id?: number
          metadata?: Json
          metric?: string
          occurred_at?: string
          source_id?: number
          source_table?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "actividad_desarrollo_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_desarrollo_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_desarrollo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_desarrollo_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda: {
        Row: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          archived_reason?: string | null
          completed?: boolean
          converted_to_tarea_id?: number | null
          created_at?: string
          description: string
          empresa_id?: number | null
          equipo_id?: number | null
          event_date: string
          gcal_event_id?: string | null
          id?: number
          owner_user_id?: number | null
          priority?: string
          result?: string | null
          time?: string | null
          tipo?: string
          user_id?: number | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          archived_reason?: string | null
          completed?: boolean
          converted_to_tarea_id?: number | null
          created_at?: string
          description?: string
          empresa_id?: number | null
          equipo_id?: number | null
          event_date?: string
          gcal_event_id?: string | null
          id?: number
          owner_user_id?: number | null
          priority?: string
          result?: string | null
          time?: string | null
          tipo?: string
          user_id?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_converted_to_tarea_id_fkey"
            columns: ["converted_to_tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_usuarios: {
        Row: {
          agenda_id: number
          created_at: string
          id: number
          usuario_id: number
        }
        Insert: {
          agenda_id: number
          created_at?: string
          id?: number
          usuario_id: number
        }
        Update: {
          agenda_id?: number
          created_at?: string
          id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_usuarios_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      agente_del_mes: {
        Row: {
          agente_id: number | null
          agente_nombre: string | null
          anadido_por: string
          created_at: string | null
          empresa_id: number
          id: number
          mes: string
          premio: string
          updated_at: string | null
        }
        Insert: {
          agente_id?: number | null
          agente_nombre?: string | null
          anadido_por: string
          created_at?: string | null
          empresa_id: number
          id?: number
          mes: string
          premio: string
          updated_at?: string | null
        }
        Update: {
          agente_id?: number | null
          agente_nombre?: string | null
          anadido_por?: string
          created_at?: string | null
          empresa_id?: number
          id?: number
          mes?: string
          premio?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agente_del_mes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agente_del_mes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      archivos: {
        Row: {
          created_at: string
          id: number
          nombre: string
          propiedad_id: number | null
          storage_path: string | null
          tipo: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nombre: string
          propiedad_id?: number | null
          storage_path?: string | null
          tipo?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nombre?: string
          propiedad_id?: number | null
          storage_path?: string | null
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archivos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_seguridad: {
        Row: {
          delete_confirmation_password_hash: string | null
          id: number
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          delete_confirmation_password_hash?: string | null
          id: number
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          delete_confirmation_password_hash?: string | null
          id?: number
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_seguridad_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contactos_soporte: {
        Row: {
          apellidos: string | null
          cargo: string | null
          email: string | null
          id: number
          nombre: string
          orden: number
          telefono: string | null
        }
        Insert: {
          apellidos?: string | null
          cargo?: string | null
          email?: string | null
          id?: number
          nombre: string
          orden?: number
          telefono?: string | null
        }
        Update: {
          apellidos?: string | null
          cargo?: string | null
          email?: string | null
          id?: number
          nombre?: string
          orden?: number
          telefono?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      encargo_notas: {
        Row: {
          contenido: string
          created_at: string
          id: number
          propiedad_id: number
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: never
          propiedad_id: number
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: never
          propiedad_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "encargo_notas_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      encargo_visitas: {
        Row: {
          agente_id: number | null
          agente_nombre: string
          created_at: string
          fecha_visita: string
          id: number
          observaciones: string | null
          propiedad_id: number
        }
        Insert: {
          agente_id?: number | null
          agente_nombre: string
          created_at?: string
          fecha_visita?: string
          id?: number
          observaciones?: string | null
          propiedad_id: number
        }
        Update: {
          agente_id?: number | null
          agente_nombre?: string
          created_at?: string
          fecha_visita?: string
          id?: number
          observaciones?: string | null
          propiedad_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "encargo_visitas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encargo_visitas_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          created_at: string
          empresa_id: number
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string
          empresa_id: number
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string
          empresa_id?: number
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fincas: {
        Row: {
          id: number
          numero: string
          posicion: number | null
          sector_id: number | null
        }
        Insert: {
          id?: number
          numero: string
          posicion?: number | null
          sector_id?: number | null
        }
        Update: {
          id?: number
          numero?: string
          posicion?: number | null
          sector_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fincas_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectores"
            referencedColumns: ["id"]
          },
        ]
      }
      idealista_leads: {
        Row: {
          asunto: string | null
          created_at: string
          email_contacto: string | null
          empresa_id: number | null
          estado: string
          fecha_contacto: string | null
          gmail_message_id: string
          id: number
          mensaje: string | null
          nombre: string | null
          notas: string | null
          referencia: string | null
          telefono: string | null
          titulo_propiedad: string | null
          url_propiedad: string | null
        }
        Insert: {
          asunto?: string | null
          created_at?: string
          email_contacto?: string | null
          empresa_id?: number | null
          estado?: string
          fecha_contacto?: string | null
          gmail_message_id: string
          id?: number
          mensaje?: string | null
          nombre?: string | null
          notas?: string | null
          referencia?: string | null
          telefono?: string | null
          titulo_propiedad?: string | null
          url_propiedad?: string | null
        }
        Update: {
          asunto?: string | null
          created_at?: string
          email_contacto?: string | null
          empresa_id?: number | null
          estado?: string
          fecha_contacto?: string | null
          gmail_message_id?: string
          id?: number
          mensaje?: string | null
          nombre?: string | null
          notas?: string | null
          referencia?: string | null
          telefono?: string | null
          titulo_propiedad?: string | null
          url_propiedad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idealista_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columnas: {
        Row: {
          col_id: string
          created_at: string | null
          id: number
          orden: number | null
          titulo: string
          user_id: number
        }
        Insert: {
          col_id: string
          created_at?: string | null
          id?: number
          orden?: number | null
          titulo: string
          user_id: number
        }
        Update: {
          col_id?: string
          created_at?: string | null
          id?: number
          orden?: number | null
          titulo?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columnas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          altura_deseada: string | null
          banos: number | null
          caracteristicas: string | null
          compra_alquiler: boolean | null
          empresa_id: number | null
          equipo_id: number | null
          garaje: boolean | null
          habitaciones: number | null
          id: number
          modalidad: string | null
          nombre_cliente: string
          notas: string | null
          origen: string | null
          owner_user_id: number | null
          presupuesto: number | null
          referencia: string | null
          telefono: string | null
          tipo_propiedad: string | null
          visibility: string
          visibility_agente_ids: number[] | null
          zona_busqueda: string | null
          zona_deseada: number | null
        }
        Insert: {
          altura_deseada?: string | null
          banos?: number | null
          caracteristicas?: string | null
          compra_alquiler?: boolean | null
          empresa_id?: number | null
          equipo_id?: number | null
          garaje?: boolean | null
          habitaciones?: number | null
          id?: number
          modalidad?: string | null
          nombre_cliente: string
          notas?: string | null
          origen?: string | null
          owner_user_id?: number | null
          presupuesto?: number | null
          referencia?: string | null
          telefono?: string | null
          tipo_propiedad?: string | null
          visibility?: string
          visibility_agente_ids?: number[] | null
          zona_busqueda?: string | null
          zona_deseada?: number | null
        }
        Update: {
          altura_deseada?: string | null
          banos?: number | null
          caracteristicas?: string | null
          compra_alquiler?: boolean | null
          empresa_id?: number | null
          equipo_id?: number | null
          garaje?: boolean | null
          habitaciones?: number | null
          id?: number
          modalidad?: string | null
          nombre_cliente?: string
          notas?: string | null
          origen?: string | null
          owner_user_id?: number | null
          presupuesto?: number | null
          referencia?: string | null
          telefono?: string | null
          tipo_propiedad?: string | null
          visibility?: string
          visibility_agente_ids?: number[] | null
          zona_busqueda?: string | null
          zona_deseada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_zona_deseada_fkey"
            columns: ["zona_deseada"]
            isOneToOne: false
            referencedRelation: "zona"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          agente_asignado: number | null
          calidad_ficha_score: number
          contactado: boolean
          contactado_hasta: string | null
          created_at: string
          descripcion: string | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          estado_publicacion_web: string
          faltantes_ficha: unknown[]
          fecha_visita: string | null
          ficha_completa: boolean
          finca_id: number | null
          honorarios: number | null
          id: number
          latitud: number | null
          longitud: number | null
          notas: string | null
          owner_user_id: number | null
          planta: string | null
          posicion: number | null
          precio: number | null
          propietario: string | null
          publicar_en_web: boolean
          puerta: string | null
          telefono: string | null
          tipo_operacion: string | null
          titulo: string | null
          updated_at: string | null
          visibility: string
          web_descripcion: string | null
          web_destacada: boolean
          web_error_sync: string | null
          web_precio_visible: boolean
          web_titulo: string | null
          web_ultima_sincronizacion: string | null
        }
        Insert: {
          agente_asignado?: number | null
          calidad_ficha_score?: number
          contactado?: boolean
          contactado_hasta?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          estado_publicacion_web?: string
          faltantes_ficha?: unknown[]
          fecha_visita?: string | null
          ficha_completa?: boolean
          finca_id?: number | null
          honorarios?: number | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          owner_user_id?: number | null
          planta?: string | null
          posicion?: number | null
          precio?: number | null
          propietario?: string | null
          publicar_en_web?: boolean
          puerta?: string | null
          telefono?: string | null
          tipo_operacion?: string | null
          titulo?: string | null
          updated_at?: string | null
          visibility?: string
          web_descripcion?: string | null
          web_destacada?: boolean
          web_error_sync?: string | null
          web_precio_visible?: boolean
          web_titulo?: string | null
          web_ultima_sincronizacion?: string | null
        }
        Update: {
          agente_asignado?: number | null
          calidad_ficha_score?: number
          contactado?: boolean
          contactado_hasta?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          estado_publicacion_web?: string
          faltantes_ficha?: unknown[]
          fecha_visita?: string | null
          ficha_completa?: boolean
          finca_id?: number | null
          honorarios?: number | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          owner_user_id?: number | null
          planta?: string | null
          posicion?: number | null
          precio?: number | null
          propietario?: string | null
          publicar_en_web?: boolean
          puerta?: string | null
          telefono?: string | null
          tipo_operacion?: string | null
          titulo?: string | null
          updated_at?: string | null
          visibility?: string
          web_descripcion?: string | null
          web_destacada?: boolean
          web_error_sync?: string | null
          web_precio_visible?: boolean
          web_titulo?: string | null
          web_ultima_sincronizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propiedades_agente_asignado_fkey"
            columns: ["agente_asignado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_finca_id_fkey"
            columns: ["finca_id"]
            isOneToOne: false
            referencedRelation: "fincas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rendimiento: {
        Row: {
          agente_id: number
          anio: number
          contactos: number
          created_at: string
          encargos: number
          facturado: number
          id: number
          mes: number
          objetivo_contactos: number
          objetivo_encargos: number
          objetivo_facturado: number
          objetivo_ventas: number
          updated_at: string
          ventas: number
        }
        Insert: {
          agente_id: number
          anio: number
          contactos?: number
          created_at?: string
          encargos?: number
          facturado?: number
          id?: number
          mes?: number
          objetivo_contactos?: number
          objetivo_encargos?: number
          objetivo_facturado?: number
          objetivo_ventas?: number
          updated_at?: string
          ventas?: number
        }
        Update: {
          agente_id?: number
          anio?: number
          contactos?: number
          created_at?: string
          encargos?: number
          facturado?: number
          id?: number
          mes?: number
          objetivo_contactos?: number
          objetivo_encargos?: number
          objetivo_facturado?: number
          objetivo_ventas?: number
          updated_at?: string
          ventas?: number
        }
        Relationships: [
          {
            foreignKeyName: "rendimiento_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sectores: {
        Row: {
          id: number
          numero: number
          posicion: number | null
          zona_id: number | null
        }
        Insert: {
          id?: number
          numero: number
          posicion?: number | null
          zona_id?: number | null
        }
        Update: {
          id?: number
          numero?: number
          posicion?: number | null
          zona_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sectores_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zona"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_usuarios: {
        Row: {
          created_at: string
          id: number
          tarea_id: number
          usuario_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          tarea_id: number
          usuario_id: number
        }
        Update: {
          created_at?: string
          id?: number
          tarea_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarea_usuarios_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        Insert: {
          agente_asignado?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          converted_to_agenda_id?: number | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          fecha?: string | null
          from_orden_dia?: boolean
          id?: number
          owner_user_id?: number | null
          prioridad?: string | null
          resultado?: string | null
          titulo: string
          visibility?: string
        }
        Update: {
          agente_asignado?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          converted_to_agenda_id?: number | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          fecha?: string | null
          from_orden_dia?: boolean
          id?: number
          owner_user_id?: number | null
          prioridad?: string | null
          resultado?: string | null
          titulo?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_agente_asignado_fkey"
            columns: ["agente_asignado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_converted_to_agenda_id_fkey"
            columns: ["converted_to_agenda_id"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_soporte: {
        Row: {
          asunto: string
          created_at: string | null
          descripcion: string
          estado: string
          id: number
          nombre_usuario: string | null
          prioridad: string
          respondido_at: string | null
          respondido_por_nombre: string | null
          respuesta: string | null
          tipo: string
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          asunto: string
          created_at?: string | null
          descripcion: string
          estado?: string
          id?: number
          nombre_usuario?: string | null
          prioridad?: string
          respondido_at?: string | null
          respondido_por_nombre?: string | null
          respuesta?: string | null
          tipo: string
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          asunto?: string
          created_at?: string | null
          descripcion?: string
          estado?: string
          id?: number
          nombre_usuario?: string | null
          prioridad?: string
          respondido_at?: string | null
          respondido_por_nombre?: string | null
          respuesta?: string | null
          tipo?: string
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_soporte_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_orden: {
        Row: {
          id: number
          item_id: number
          posicion: number
          tabla: string
          usuario_id: number
        }
        Insert: {
          id?: never
          item_id: number
          posicion: number
          tabla: string
          usuario_id: number
        }
        Update: {
          id?: never
          item_id?: number
          posicion?: number
          tabla?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuario_orden_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          apellidos: string
          auth_id: string | null
          avatar_url: string | null
          correo: string
          empresa_id: number | null
          equipo_id: number | null
          estado: string
          id: number
          nombre: string
          rol: string
          supervisor_id: number | null
        }
        Insert: {
          apellidos: string
          auth_id?: string | null
          avatar_url?: string | null
          correo: string
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string
          id?: number
          nombre: string
          rol?: string
          supervisor_id?: number | null
        }
        Update: {
          apellidos?: string
          auth_id?: string | null
          avatar_url?: string | null
          correo?: string
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string
          id?: number
          nombre?: string
          rol?: string
          supervisor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      zona: {
        Row: {
          id: number
          nombre: string
          posicion: number | null
        }
        Insert: {
          id?: number
          nombre: string
          posicion?: number | null
        }
        Update: {
          id?: number
          nombre?: string
          posicion?: number | null
        }
        Relationships: []
      }
      zona_acceso: {
        Row: {
          created_at: string
          id: number
          usuario_id: number
          zona_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          usuario_id: number
          zona_id: number
        }
        Update: {
          created_at?: string
          id?: number
          usuario_id?: number
          zona_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "zona_acceso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zona_acceso_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zona"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_agenda: {
        Args: { p_agenda_id: number; p_reason?: string }
        Returns: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "agenda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_tarea: {
        Args: { p_reason?: string; p_tarea_id: number }
        Returns: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_scoped_row: {
        Args: {
          row_empresa_id: number
          row_equipo_id: number
          row_owner_user_id: number
          row_visibility: string
        }
        Returns: boolean
      }
      can_manage_agent_objectives: {
        Args: { target_agente_id: number }
        Returns: boolean
      }
      can_manage_scoped_row: {
        Args: { row_empresa_id: number; row_owner_user_id: number }
        Returns: boolean
      }
      can_view_agent_metrics: {
        Args: { target_agente_id: number }
        Returns: boolean
      }
      convert_agenda_to_tarea: {
        Args: { p_agenda_id: number; p_assigned_user_ids?: number[] }
        Returns: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_tarea_to_agenda: {
        Args: {
          p_assigned_user_ids?: number[]
          p_event_date: string
          p_tarea_id: number
          p_time: string
        }
        Returns: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "agenda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_agenda_activity: {
        Args: {
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_description: string
          p_event_date: string
          p_priority?: string
          p_result?: string
          p_time: string
          p_tipo?: string
          p_visibility?: string
        }
        Returns: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "agenda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_pending_tarea: {
        Args: {
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_prioridad?: string
          p_resultado?: string
          p_titulo: string
          p_visibility?: string
        }
        Returns: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_empresa_id: { Args: never; Returns: number }
      current_equipo_id: { Args: never; Returns: number }
      current_user_can_use_usuario: {
        Args: { target_usuario_id: number }
        Returns: boolean
      }
      current_user_role: { Args: never; Returns: string }
      current_usuario_id: { Args: never; Returns: number }
      delete_finca_cascade: {
        Args: { target_finca_id: number }
        Returns: {
          deleted_fincas: number
          deleted_propiedades: number
        }[]
      }
      delete_sector_cascade: {
        Args: { target_sector_id: number }
        Returns: {
          deleted_fincas: number
          deleted_propiedades: number
          deleted_sectores: number
        }[]
      }
      delete_zona_cascade: {
        Args: { target_zona_id: number }
        Returns: {
          deleted_fincas: number
          deleted_propiedades: number
          deleted_sectores: number
          deleted_zonas: number
        }[]
      }
      get_supervised_user_ids: { Args: never; Returns: number[] }
      insert_desarrollo_activity: {
        Args: {
          target_action: string
          target_actor_user_id: number
          target_agente_id: number
          target_metadata?: Json
          target_metric: string
          target_source_id: number
          target_source_table: string
          target_value?: number
        }
        Returns: undefined
      }
      is_admin_or_director: { Args: never; Returns: boolean }
      is_agenda_assigned: {
        Args: { target_agenda_id: number }
        Returns: boolean
      }
      is_tarea_assigned: { Args: { target_tarea_id: number }; Returns: boolean }
      normalize_agenda_priority: {
        Args: { raw_priority: string }
        Returns: string
      }
      normalize_agenda_tipo: { Args: { raw_tipo: string }; Returns: string }
      normalize_assigned_user_ids: {
        Args: { candidate_ids: number[]; fallback_id: number }
        Returns: number[]
      }
      normalize_visibility: {
        Args: { raw_visibility: string }
        Returns: string
      }
      set_agenda_completed: {
        Args: { p_agenda_id: number; p_completed: boolean; p_result?: string }
        Returns: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "agenda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_tarea_completed: {
        Args: { p_completed: boolean; p_resultado?: string; p_tarea_id: number }
        Returns: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_agenda_activity: {
        Args: {
          p_agenda_id: number
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_description: string
          p_event_date: string
          p_priority?: string
          p_result?: string
          p_time: string
          p_tipo?: string
        }
        Returns: {
          archived_at: string | null
          archived_reason: string | null
          completed: boolean
          converted_to_tarea_id: number | null
          created_at: string
          description: string
          empresa_id: number | null
          equipo_id: number | null
          event_date: string
          gcal_event_id: string | null
          id: number
          owner_user_id: number | null
          priority: string
          result: string | null
          time: string | null
          tipo: string
          user_id: number | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "agenda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_pending_tarea: {
        Args: {
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_prioridad?: string
          p_resultado?: string
          p_tarea_id: number
          p_titulo: string
        }
        Returns: {
          agente_asignado: number | null
          archived_at: string | null
          archived_reason: string | null
          converted_to_agenda_id: number | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          fecha: string | null
          from_orden_dia: boolean
          id: number
          owner_user_id: number | null
          prioridad: string | null
          resultado: string | null
          titulo: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "tareas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_facturado_activity: {
        Args: {
          target_actor_user_id: number
          target_agente_id: number
          target_source_id: number
          target_value: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
