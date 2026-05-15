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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_control_rules: {
        Row: {
          action: string
          created_at: string
          empresa_id: number
          enabled: boolean
          id: number
          resource_key: string
          resource_type: string
          role: string
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          action?: string
          created_at?: string
          empresa_id: number
          enabled?: boolean
          id?: number
          resource_key: string
          resource_type: string
          role: string
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          empresa_id?: number
          enabled?: boolean
          id?: number
          resource_key?: string
          resource_type?: string
          role?: string
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "access_control_rules_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_control_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
          google_calendar_id?: string | null
          id?: number
          last_synced_at?: string | null
          owner_user_id?: number | null
          priority?: string
          reminder_minutes_before?: number | null
          result?: string | null
          sync_error?: string | null
          sync_status?: string
          time?: string | null
          time_end?: string | null
          timezone?: string
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
          google_calendar_id?: string | null
          id?: number
          last_synced_at?: string | null
          owner_user_id?: number | null
          priority?: string
          reminder_minutes_before?: number | null
          result?: string | null
          sync_error?: string | null
          sync_status?: string
          time?: string | null
          time_end?: string | null
          timezone?: string
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
      agenda_notificaciones: {
        Row: {
          agenda_id: number
          cancelled_at: string | null
          created_at: string
          empresa_id: number
          id: number
          notified_at: string | null
          scheduled_at: string
          updated_at: string | null
          usuario_id: number
        }
        Insert: {
          agenda_id: number
          cancelled_at?: string | null
          created_at?: string
          empresa_id: number
          id?: number
          notified_at?: string | null
          scheduled_at: string
          updated_at?: string | null
          usuario_id: number
        }
        Update: {
          agenda_id?: number
          cancelled_at?: string | null
          created_at?: string
          empresa_id?: number
          id?: number
          notified_at?: string | null
          scheduled_at?: string
          updated_at?: string | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_notificaciones_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_notificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
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
          ciclo_comercial_id: number | null
          created_at: string
          empresa_id: number | null
          id: number
          nombre: string
          owner_user_id: number | null
          propiedad_id: number | null
          storage_path: string | null
          tipo: string
          url: string | null
        }
        Insert: {
          ciclo_comercial_id?: number | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          nombre: string
          owner_user_id?: number | null
          propiedad_id?: number | null
          storage_path?: string | null
          tipo?: string
          url?: string | null
        }
        Update: {
          ciclo_comercial_id?: number | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          nombre?: string
          owner_user_id?: number | null
          propiedad_id?: number | null
          storage_path?: string | null
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archivos_ciclo_comercial_id_fkey"
            columns: ["ciclo_comercial_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archivos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archivos_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archivos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboraciones: {
        Row: {
          agente_colaborador_id: number
          agente_owner_id: number
          created_at: string
          empresa_id: number
          entidad_id: number
          entidad_tipo: string
          estado: string
          id: number
          notas: string | null
          porcentaje_comision: number | null
          updated_at: string
        }
        Insert: {
          agente_colaborador_id: number
          agente_owner_id: number
          created_at?: string
          empresa_id: number
          entidad_id: number
          entidad_tipo: string
          estado?: string
          id?: number
          notas?: string | null
          porcentaje_comision?: number | null
          updated_at?: string
        }
        Update: {
          agente_colaborador_id?: number
          agente_owner_id?: number
          created_at?: string
          empresa_id?: number
          entidad_id?: number
          entidad_tipo?: string
          estado?: string
          id?: number
          notas?: string | null
          porcentaje_comision?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboraciones_agente_colaborador_id_fkey"
            columns: ["agente_colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboraciones_agente_owner_id_fkey"
            columns: ["agente_owner_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboraciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      contacto_timeline_events: {
        Row: {
          agente_id: number | null
          ciclo_comercial_id: number | null
          contacto_id: number | null
          created_at: string
          descripcion: string | null
          empresa_id: number | null
          id: number
          metadata: Json
          pedido_id: number | null
          propiedad_id: number | null
          tipo_evento: string
          titulo: string
        }
        Insert: {
          agente_id?: number | null
          ciclo_comercial_id?: number | null
          contacto_id?: number | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: number | null
          id?: number
          metadata?: Json
          pedido_id?: number | null
          propiedad_id?: number | null
          tipo_evento: string
          titulo: string
        }
        Update: {
          agente_id?: number | null
          ciclo_comercial_id?: number | null
          contacto_id?: number | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: number | null
          id?: number
          metadata?: Json
          pedido_id?: number | null
          propiedad_id?: number | null
          tipo_evento?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacto_timeline_events_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacto_timeline_events_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacto_timeline_events_ciclo_comercial_id_fkey"
            columns: ["ciclo_comercial_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacto_timeline_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacto_timeline_events_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacto_timeline_events_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      contactos: {
        Row: {
          apellidos: string | null
          archived_at: string | null
          cargo: string | null
          ciudad: string | null
          codigo_postal: string | null
          created_at: string
          direccion: string | null
          email: string | null
          empresa: string | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string
          id: number
          nombre: string
          notas: string | null
          origen: string | null
          owner_user_id: number | null
          pais: string
          provincia: string | null
          telefono: string | null
          telefono_secundario: string | null
          tipo: string
          updated_at: string
          visibility: string
        }
        Insert: {
          apellidos?: string | null
          archived_at?: string | null
          cargo?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string
          id?: number
          nombre: string
          notas?: string | null
          origen?: string | null
          owner_user_id?: number | null
          pais?: string
          provincia?: string | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          apellidos?: string | null
          archived_at?: string | null
          cargo?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string
          id?: number
          nombre?: string
          notas?: string | null
          origen?: string | null
          owner_user_id?: number | null
          pais?: string
          provincia?: string | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_owner_user_id_fkey"
            columns: ["owner_user_id"]
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
      documentos_generados: {
        Row: {
          ciclo_comercial_id: number | null
          contacto_id: number | null
          created_at: string
          empresa_id: number | null
          generado_por: number | null
          id: number
          pedido_id: number | null
          propiedad_id: number | null
          tipo_documento: string
        }
        Insert: {
          ciclo_comercial_id?: number | null
          contacto_id?: number | null
          created_at?: string
          empresa_id?: number | null
          generado_por?: number | null
          id?: number
          pedido_id?: number | null
          propiedad_id?: number | null
          tipo_documento: string
        }
        Update: {
          ciclo_comercial_id?: number | null
          contacto_id?: number | null
          created_at?: string
          empresa_id?: number | null
          generado_por?: number | null
          id?: number
          pedido_id?: number | null
          propiedad_id?: number | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_generados_ciclo_comercial_id_fkey"
            columns: ["ciclo_comercial_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_generados_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_generados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_generados_generado_por_fkey"
            columns: ["generado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_generados_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_generados_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          email: string
          empresa_id: number | null
          id: number
          last_error: string | null
          last_history_id: string | null
          last_sync_at: string | null
          provider: string
          refresh_token_encrypted: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: number
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          email: string
          empresa_id?: number | null
          id?: number
          last_error?: string | null
          last_history_id?: string | null
          last_sync_at?: string | null
          provider?: string
          refresh_token_encrypted?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: number
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          email?: string
          empresa_id?: number | null
          id?: number
          last_error?: string | null
          last_history_id?: string | null
          last_sync_at?: string | null
          provider?: string
          refresh_token_encrypted?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          due_at: string | null
          email_message_id: number
          empresa_id: number | null
          id: number
          resolved_at: string | null
          severity: string
          status: string
          title: string
          user_id: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          email_message_id: number
          empresa_id?: number | null
          id?: number
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          user_id: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          email_message_id?: number
          empresa_id?: number | null
          id?: number
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_alerts_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_alerts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          created_at: string
          document_type: string
          email_message_id: number
          empresa_id: number | null
          filename: string
          id: number
          linked_entity_id: number | null
          linked_entity_type: string | null
          mime_type: string | null
          provider_attachment_id: string | null
          size_bytes: number | null
          storage_path: string | null
          user_id: number
        }
        Insert: {
          created_at?: string
          document_type?: string
          email_message_id: number
          empresa_id?: number | null
          filename: string
          id?: number
          linked_entity_id?: number | null
          linked_entity_type?: string | null
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id: number
        }
        Update: {
          created_at?: string
          document_type?: string
          email_message_id?: number
          empresa_id?: number | null
          filename?: string
          id?: number
          linked_entity_id?: number | null
          linked_entity_type?: string | null
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_attachments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_entity_links: {
        Row: {
          confidence_score: number
          created_at: string
          email_message_id: number
          empresa_id: number | null
          entity_id: number
          entity_type: string
          id: number
          linked_by: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          email_message_id: number
          empresa_id?: number | null
          entity_id: number
          entity_type: string
          id?: number
          linked_by?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          email_message_id?: number
          empresa_id?: number | null
          entity_id?: number
          entity_type?: string
          id?: number
          linked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_entity_links_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_entity_links_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          account_id: number
          archived_at: string | null
          body_html: string | null
          body_text: string | null
          captured_lead_id: number | null
          cc_emails: Json
          commercial_bucket: string
          commercial_priority: number
          created_at: string
          direction: string
          empresa_id: number | null
          folder: string
          from_email: string | null
          from_name: string | null
          has_attachments: boolean
          id: number
          intent: string | null
          is_read: boolean
          needs_response: boolean
          portal_source: string | null
          provider: string
          provider_message_id: string
          provider_thread_id: string | null
          raw_metadata: Json
          received_at: string | null
          responded_at: string | null
          response_due_at: string | null
          sent_at: string | null
          snippet: string | null
          subject: string | null
          to_emails: Json
          urgency: string
          user_id: number
        }
        Insert: {
          account_id: number
          archived_at?: string | null
          body_html?: string | null
          body_text?: string | null
          captured_lead_id?: number | null
          cc_emails?: Json
          commercial_bucket?: string
          commercial_priority?: number
          created_at?: string
          direction?: string
          empresa_id?: number | null
          folder?: string
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: number
          intent?: string | null
          is_read?: boolean
          needs_response?: boolean
          portal_source?: string | null
          provider?: string
          provider_message_id: string
          provider_thread_id?: string | null
          raw_metadata?: Json
          received_at?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          to_emails?: Json
          urgency?: string
          user_id: number
        }
        Update: {
          account_id?: number
          archived_at?: string | null
          body_html?: string | null
          body_text?: string | null
          captured_lead_id?: number | null
          cc_emails?: Json
          commercial_bucket?: string
          commercial_priority?: number
          created_at?: string
          direction?: string
          empresa_id?: number | null
          folder?: string
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: number
          intent?: string | null
          is_read?: boolean
          needs_response?: boolean
          portal_source?: string | null
          provider?: string
          provider_message_id?: string
          provider_thread_id?: string | null
          raw_metadata?: Json
          received_at?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          to_emails?: Json
          urgency?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_captured_lead_id_fkey"
            columns: ["captured_lead_id"]
            isOneToOne: false
            referencedRelation: "idealista_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string | null
          body_text: string
          category: string
          created_at: string
          created_by: number | null
          empresa_id: number | null
          id: number
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text: string
          category: string
          created_at?: string
          created_by?: number | null
          empresa_id?: number | null
          id?: number
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string
          category?: string
          created_at?: string
          created_by?: number | null
          empresa_id?: number | null
          id?: number
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
          ciclo_comercial_id: number | null
          contenido: string
          created_at: string
          id: number
          propiedad_id: number
        }
        Insert: {
          ciclo_comercial_id?: number | null
          contenido: string
          created_at?: string
          id?: never
          propiedad_id: number
        }
        Update: {
          ciclo_comercial_id?: number | null
          contenido?: string
          created_at?: string
          id?: never
          propiedad_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "encargo_notas_ciclo_comercial_id_fkey"
            columns: ["ciclo_comercial_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
            referencedColumns: ["id"]
          },
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
          ciclo_comercial_id: number | null
          created_at: string
          fecha_visita: string
          id: number
          observaciones: string | null
          propiedad_id: number
          visitante_nombre: string | null
          visitante_telefono: string | null
        }
        Insert: {
          agente_id?: number | null
          agente_nombre: string
          ciclo_comercial_id?: number | null
          created_at?: string
          fecha_visita?: string
          id?: number
          observaciones?: string | null
          propiedad_id: number
          visitante_nombre?: string | null
          visitante_telefono?: string | null
        }
        Update: {
          agente_id?: number | null
          agente_nombre?: string
          ciclo_comercial_id?: number | null
          created_at?: string
          fecha_visita?: string
          id?: number
          observaciones?: string | null
          propiedad_id?: number
          visitante_nombre?: string | null
          visitante_telefono?: string | null
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
            foreignKeyName: "encargo_visitas_ciclo_comercial_id_fkey"
            columns: ["ciclo_comercial_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
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
      global_search_index: {
        Row: {
          created_at: string | null
          empresa_id: number | null
          entity_id: string
          entity_type: string
          href: string
          id: string
          metadata: Json | null
          owner_user_id: number | null
          search_text: string
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id?: number | null
          entity_id: string
          entity_type: string
          href: string
          id?: string
          metadata?: Json | null
          owner_user_id?: number | null
          search_text: string
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: number | null
          entity_id?: string
          entity_type?: string
          href?: string
          id?: string
          metadata?: Json | null
          owner_user_id?: number | null
          search_text?: string
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      kanban_card_orden: {
        Row: {
          column_id: string
          db_id: number
          id: number
          posicion: number
          source: string
          updated_at: string
          user_id: number
        }
        Insert: {
          column_id: string
          db_id: number
          id?: number
          posicion: number
          source: string
          updated_at?: string
          user_id: number
        }
        Update: {
          column_id?: string
          db_id?: number
          id?: number
          posicion?: number
          source?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_orden_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      pipeline_state_suggestions: {
        Row: {
          agente_id: number | null
          created_at: string
          dias_sin_actividad: number | null
          empresa_id: number | null
          estado_actual: string
          estado_sugerido: string
          id: number
          pedido_id: number | null
          propiedad_id: number | null
          razon: string
          resuelta_at: string | null
          resuelta_por: number | null
          status: string
          tipo_regla: string
        }
        Insert: {
          agente_id?: number | null
          created_at?: string
          dias_sin_actividad?: number | null
          empresa_id?: number | null
          estado_actual: string
          estado_sugerido: string
          id?: number
          pedido_id?: number | null
          propiedad_id?: number | null
          razon: string
          resuelta_at?: string | null
          resuelta_por?: number | null
          status?: string
          tipo_regla: string
        }
        Update: {
          agente_id?: number | null
          created_at?: string
          dias_sin_actividad?: number | null
          empresa_id?: number | null
          estado_actual?: string
          estado_sugerido?: string
          id?: number
          pedido_id?: number | null
          propiedad_id?: number | null
          razon?: string
          resuelta_at?: string | null
          resuelta_por?: number | null
          status?: string
          tipo_regla?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_state_suggestions_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_state_suggestions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_state_suggestions_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_state_suggestions_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_state_suggestions_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedad_ciclos_comerciales: {
        Row: {
          closed_at: string | null
          closed_by_user_id: number | null
          closed_reason: string | null
          created_at: string
          empresa_id: number | null
          final_status: string | null
          id: number
          initial_status: string | null
          opened_by_user_id: number | null
          propiedad_id: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by_user_id?: number | null
          closed_reason?: string | null
          created_at?: string
          empresa_id?: number | null
          final_status?: string | null
          id?: number
          initial_status?: string | null
          opened_by_user_id?: number | null
          propiedad_id: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by_user_id?: number | null
          closed_reason?: string | null
          created_at?: string
          empresa_id?: number | null
          final_status?: string | null
          id?: number
          initial_status?: string | null
          opened_by_user_id?: number | null
          propiedad_id?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      propiedad_estado_historial: {
        Row: {
          changed_at: string
          changed_by_user_id: number | null
          created_at: string
          ciclo_comercial_id: number | null
          empresa_id: number | null
          from_status: string | null
          id: number
          notes: string | null
          propiedad_id: number
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by_user_id?: number | null
          created_at?: string
          ciclo_comercial_id?: number | null
          empresa_id?: number | null
          from_status?: string | null
          id?: number
          notes?: string | null
          propiedad_id: number
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by_user_id?: number | null
          created_at?: string
          ciclo_comercial_id?: number | null
          empresa_id?: number | null
          from_status?: string | null
          id?: number
          notes?: string | null
          propiedad_id?: number
          to_status?: string
        }
        Relationships: []
      }
      propiedad_registros_venta: {
        Row: {
          buyer_name: string | null
          buyer_phone: string | null
          commission_amount: number | null
          created_at: string
          ciclo_comercial_id: number | null
          empresa_id: number | null
          id: number
          notes: string | null
          propiedad_id: number
          sale_price: number | null
          sold_at: string | null
          sold_by_user_id: number | null
          updated_at: string
        }
        Insert: {
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_amount?: number | null
          created_at?: string
          ciclo_comercial_id?: number | null
          empresa_id?: number | null
          id?: number
          notes?: string | null
          propiedad_id: number
          sale_price?: number | null
          sold_at?: string | null
          sold_by_user_id?: number | null
          updated_at?: string
        }
        Update: {
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_amount?: number | null
          created_at?: string
          ciclo_comercial_id?: number | null
          empresa_id?: number | null
          id?: number
          notes?: string | null
          propiedad_id?: number
          sale_price?: number | null
          sold_at?: string | null
          sold_by_user_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      propiedad_usuarios: {
        Row: {
          created_at: string
          id: number
          propiedad_id: number
          usuario_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          propiedad_id: number
          usuario_id: number
        }
        Update: {
          created_at?: string
          id?: number
          propiedad_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "propiedad_usuarios_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedad_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          agente_asignado: number | null
          calidad_ficha_score: number | null
          contactado: boolean
          contactado_hasta: string | null
          created_at: string
          created_by_user_id: number | null
          current_commercial_cycle_id: number | null
          descripcion: string | null
          empresa_id: number | null
          equipo_id: number | null
          estado: string | null
          estado_publicacion_web: string | null
          faltantes_ficha: Json | null
          fecha_visita: string | null
          ficha_completa: boolean | null
          finca_id: number | null
          has_sale_history: boolean
          honorarios: number | null
          id: number
          last_sold_at: string | null
          latitud: number | null
          longitud: number | null
          notas: string | null
          owner_user_id: number | null
          planta: string | null
          posicion: number | null
          precio: number | null
          propietario: string | null
          propietario_secundario: string | null
          publicar_en_web: boolean | null
          puerta: string | null
          telefono: string | null
          telefono_secundario: string | null
          tipo_operacion: string | null
          titulo: string | null
          updated_at: string | null
          visibility: string
          web_descripcion: string | null
          web_destacada: boolean | null
          web_error_sync: string | null
          web_precio_visible: boolean | null
          web_titulo: string | null
          web_ultima_sincronizacion: string | null
        }
        Insert: {
          agente_asignado?: number | null
          calidad_ficha_score?: number | null
          contactado?: boolean
          contactado_hasta?: string | null
          created_at?: string
          created_by_user_id?: number | null
          current_commercial_cycle_id?: number | null
          descripcion?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          estado_publicacion_web?: string | null
          faltantes_ficha?: Json | null
          fecha_visita?: string | null
          ficha_completa?: boolean | null
          finca_id?: number | null
          has_sale_history?: boolean
          honorarios?: number | null
          id?: number
          last_sold_at?: string | null
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          owner_user_id?: number | null
          planta?: string | null
          posicion?: number | null
          precio?: number | null
          propietario?: string | null
          propietario_secundario?: string | null
          publicar_en_web?: boolean | null
          puerta?: string | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo_operacion?: string | null
          titulo?: string | null
          updated_at?: string | null
          visibility?: string
          web_descripcion?: string | null
          web_destacada?: boolean | null
          web_error_sync?: string | null
          web_precio_visible?: boolean | null
          web_titulo?: string | null
          web_ultima_sincronizacion?: string | null
        }
        Update: {
          agente_asignado?: number | null
          calidad_ficha_score?: number | null
          contactado?: boolean
          contactado_hasta?: string | null
          created_at?: string
          created_by_user_id?: number | null
          current_commercial_cycle_id?: number | null
          descripcion?: string | null
          empresa_id?: number | null
          equipo_id?: number | null
          estado?: string | null
          estado_publicacion_web?: string | null
          faltantes_ficha?: Json | null
          fecha_visita?: string | null
          ficha_completa?: boolean | null
          finca_id?: number | null
          has_sale_history?: boolean
          honorarios?: number | null
          id?: number
          last_sold_at?: string | null
          latitud?: number | null
          longitud?: number | null
          notas?: string | null
          owner_user_id?: number | null
          planta?: string | null
          posicion?: number | null
          precio?: number | null
          propietario?: string | null
          propietario_secundario?: string | null
          publicar_en_web?: boolean | null
          puerta?: string | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo_operacion?: string | null
          titulo?: string | null
          updated_at?: string | null
          visibility?: string
          web_descripcion?: string | null
          web_destacada?: boolean | null
          web_error_sync?: string | null
          web_precio_visible?: boolean | null
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
            foreignKeyName: "propiedades_current_commercial_cycle_id_fkey"
            columns: ["current_commercial_cycle_id"]
            isOneToOne: false
            referencedRelation: "propiedad_ciclos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
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
      soporte_mensajes: {
        Row: {
          autor_id: number | null
          autor_nombre: string
          autor_rol: string
          contenido: string
          created_at: string
          es_sistema: boolean
          id: number
          ticket_id: number
        }
        Insert: {
          autor_id?: number | null
          autor_nombre: string
          autor_rol?: string
          contenido: string
          created_at?: string
          es_sistema?: boolean
          id?: number
          ticket_id: number
        }
        Update: {
          autor_id?: number | null
          autor_nombre?: string
          autor_rol?: string
          contenido?: string
          created_at?: string
          es_sistema?: boolean
          id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "soporte_mensajes_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soporte_mensajes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_soporte"
            referencedColumns: ["id"]
          },
        ]
      }
      soporte_notificaciones: {
        Row: {
          created_at: string
          empresa_id: number
          id: number
          leido: boolean
          leido_at: string | null
          mensaje: string
          ticket_id: number
          tipo: string
          usuario_id: number
        }
        Insert: {
          created_at?: string
          empresa_id: number
          id?: number
          leido?: boolean
          leido_at?: string | null
          mensaje: string
          ticket_id: number
          tipo: string
          usuario_id: number
        }
        Update: {
          created_at?: string
          empresa_id?: number
          id?: number
          leido?: boolean
          leido_at?: string | null
          mensaje?: string
          ticket_id?: number
          tipo?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "soporte_notificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soporte_notificaciones_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_soporte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soporte_notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          archived_at: string | null
          asignado_a: number | null
          asunto: string
          created_at: string | null
          descripcion: string
          empresa_id: number | null
          estado: string
          id: number
          nombre_usuario: string | null
          prioridad: string
          respondido_at: string | null
          respondido_por_nombre: string | null
          respuesta: string | null
          tipo: string
          ultima_respuesta_at: string | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          archived_at?: string | null
          asignado_a?: number | null
          asunto: string
          created_at?: string | null
          descripcion: string
          empresa_id?: number | null
          estado?: string
          id?: number
          nombre_usuario?: string | null
          prioridad?: string
          respondido_at?: string | null
          respondido_por_nombre?: string | null
          respuesta?: string | null
          tipo: string
          ultima_respuesta_at?: string | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          archived_at?: string | null
          asignado_a?: number | null
          asunto?: string
          created_at?: string | null
          descripcion?: string
          empresa_id?: number | null
          estado?: string
          id?: number
          nombre_usuario?: string | null
          prioridad?: string
          respondido_at?: string | null
          respondido_por_nombre?: string | null
          respuesta?: string | null
          tipo?: string
          ultima_respuesta_at?: string | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_soporte_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          empresa_id: number | null
          id: number
          theme: string
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          empresa_id?: number | null
          id?: number
          theme?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          empresa_id?: number | null
          id?: number
          theme?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      zonas_geograficas: {
        Row: {
          archived_at: string | null
          area_sqm: number | null
          color: string
          created_at: string
          created_by: number
          descripcion: string | null
          empresa_id: number
          estado: string
          geojson: Json
          id: number
          nombre: string
          tipo: string
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          archived_at?: string | null
          area_sqm?: number | null
          color?: string
          created_at?: string
          created_by: number
          descripcion?: string | null
          empresa_id: number
          estado?: string
          geojson: Json
          id?: number
          nombre: string
          tipo?: string
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          archived_at?: string | null
          area_sqm?: number | null
          color?: string
          created_at?: string
          created_by?: number
          descripcion?: string | null
          empresa_id?: number
          estado?: string
          geojson?: Json
          id?: number
          nombre?: string
          tipo?: string
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zonas_geograficas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zonas_geograficas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zonas_geograficas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: number | null
          empresa_id: number | null
          error_message: string | null
          error_stack: string | null
          failed_at: string | null
          id: string
          max_attempts: number
          payload: Json
          priority: number
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: number | null
          empresa_id?: number | null
          error_message?: string | null
          error_stack?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: number | null
          empresa_id?: number | null
          error_message?: string | null
          error_stack?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          attempt: number
          created_at: string
          duration_ms: number | null
          id: string
          job_id: string
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id: string
          level?: string
          message: string
          metadata?: Json | null
        }
        Update: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id?: string
          level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          description: string | null
          enabled: boolean
          id: string
          job_type: string
          last_enqueued_at: string | null
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_expression: string
          description?: string | null
          enabled?: boolean
          id?: string
          job_type: string
          last_enqueued_at?: string | null
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          description?: string | null
          enabled?: boolean
          id?: string
          job_type?: string
          last_enqueued_at?: string | null
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: number
          after: Json | null
          before: Json | null
          created_at: string
          empresa_id: number | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: number
          after?: Json | null
          before?: Json | null
          created_at?: string
          empresa_id?: number | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: number
          after?: Json | null
          before?: Json | null
          created_at?: string
          empresa_id?: number | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
      calc_reminder_scheduled_at: {
        Args: { p_event_date: string; p_minutes: number; p_time: string }
        Returns: string
      }
      can_access_colaboracion: {
        Args: {
          row_colaborador_id: number
          row_empresa_id: number
          row_owner_id: number
        }
        Returns: boolean
      }
      can_access_contacto_timeline_event:
        | {
            Args: {
              row_agente_id: number
              row_contacto_id: number
              row_empresa_id: number
              row_pedido_id: number
            }
            Returns: boolean
          }
        | {
            Args: {
              row_agente_id: number
              row_contacto_id: number
              row_empresa_id: number
              row_pedido_id: number
              row_propiedad_id?: number
            }
            Returns: boolean
          }
      claim_next_job: {
        Args: { p_worker_id?: string }
        Returns: {
          attempts: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: number | null
          empresa_id: number | null
          error_message: string | null
          error_stack: string | null
          failed_at: string | null
          id: string
          max_attempts: number
          payload: Json
          priority: number
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string
        }
      }
      can_access_documento_generado: {
        Args: { row_empresa_id: number; row_generado_por: number }
        Returns: boolean
      }
      can_access_pedido: {
        Args: {
          row_empresa_id: number
          row_equipo_id: number
          row_owner_user_id: number
          row_visibility: string
          row_visibility_agente_ids: number[]
        }
        Returns: boolean
      }
      can_access_pipeline_suggestion: {
        Args: { row_agente_id: number; row_empresa_id: number }
        Returns: boolean
      }
      can_access_propiedad: {
        Args: {
          row_agente_asignado: number
          row_empresa_id: number
          row_equipo_id: number
          row_id: number
          row_owner_user_id: number
          row_visibility: string
        }
        Returns: boolean
      }
      can_access_propiedad_by_id: {
        Args: { row_propiedad_id: number }
        Returns: boolean
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
      can_manage_colaboracion: {
        Args: { row_empresa_id: number; row_owner_id: number }
        Returns: boolean
      }
      can_manage_contacto_timeline_event: {
        Args: { row_agente_id: number; row_empresa_id: number }
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
      create_agenda_activity_v2: {
        Args: {
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_description: string
          p_event_date: string
          p_priority?: string
          p_reminder_minutes?: number
          p_result?: string
          p_time: string
          p_time_end?: string
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
      current_user_id: { Args: never; Returns: number }
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
      expire_old_pipeline_suggestions: { Args: never; Returns: undefined }
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent_lower: { Args: { t: string }; Returns: string }
      update_agenda_activity: {
        Args: {
          p_agenda_id: number
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_description?: string
          p_event_date?: string
          p_priority?: string
          p_reminder_minutes?: number
          p_result?: string
          p_time?: string
          p_time_end?: string
          p_tipo?: string
        }
        Returns: undefined
      }
      update_agenda_activity_v2: {
        Args: {
          p_agenda_id: number
          p_assigned_user_ids?: number[]
          p_completed?: boolean
          p_description?: string
          p_event_date?: string
          p_priority?: string
          p_reminder_minutes?: number
          p_result?: string
          p_time?: string
          p_time_end?: string
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
          google_calendar_id: string | null
          id: number
          last_synced_at: string | null
          owner_user_id: number | null
          priority: string
          reminder_minutes_before: number | null
          result: string | null
          sync_error: string | null
          sync_status: string
          time: string | null
          time_end: string | null
          timezone: string
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
      upsert_agenda_reminders: {
        Args: {
          p_agenda_id: number
          p_empresa_id: number
          p_event_date: string
          p_minutes: number
          p_time: string
        }
        Returns: undefined
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
      job_status: "pending" | "processing" | "completed" | "failed" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      job_status: ["pending", "processing", "completed", "failed", "cancelled"],
    },
  },
} as const
