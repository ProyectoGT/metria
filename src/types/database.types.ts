export interface Database {
  public: {
    Tables: {
      actividad_desarrollo: {
        Row: {
          id: number;
          agente_id: number;
          actor_user_id: number | null;
          empresa_id: number | null;
          equipo_id: number | null;
          metric: string;
          action: string;
          source_table: string;
          source_id: number;
          value: number;
          occurred_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: number;
          agente_id: number;
          actor_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          metric: string;
          action: string;
          source_table: string;
          source_id: number;
          value?: number;
          occurred_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: number;
          agente_id?: number;
          actor_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          metric?: string;
          action?: string;
          source_table?: string;
          source_id?: number;
          value?: number;
          occurred_at?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "actividad_desarrollo_agente_id_fkey";
            columns: ["agente_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actividad_desarrollo_actor_user_id_fkey";
            columns: ["actor_user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actividad_desarrollo_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actividad_desarrollo_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      agenda: {
        Row: {
          id: number;
          description: string;
          event_date: string;
          time: string | null;
          priority: string;
          tipo: string;
          completed: boolean;
          result: string | null;
          gcal_event_id: string | null;
          user_id: number | null;
          owner_user_id: number | null;
          empresa_id: number | null;
          equipo_id: number | null;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          description: string;
          event_date: string;
          time?: string | null;
          priority?: string;
          tipo?: string;
          completed?: boolean;
          result?: string | null;
          gcal_event_id?: string | null;
          user_id?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          description?: string;
          event_date?: string;
          time?: string | null;
          priority?: string;
          tipo?: string;
          completed?: boolean;
          result?: string | null;
          gcal_event_id?: string | null;
          user_id?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_owner_user_id_fkey";
            columns: ["owner_user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      archivos: {
        Row: {
          id: number;
          nombre: string;
          propiedad_id: number | null;
          tipo: string;
          url: string | null;
          storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          nombre: string;
          propiedad_id?: number | null;
          tipo?: string;
          url?: string | null;
          storage_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          nombre?: string;
          propiedad_id?: number | null;
          tipo?: string;
          url?: string | null;
          storage_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "archivos_propiedad_id_fkey";
            columns: ["propiedad_id"];
            referencedRelation: "propiedades";
            referencedColumns: ["id"];
          },
        ];
      };
      encargo_notas: {
        Row: {
          id: number;
          propiedad_id: number;
          contenido: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          propiedad_id: number;
          contenido: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          propiedad_id?: number;
          contenido?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "encargo_notas_propiedad_id_fkey";
            columns: ["propiedad_id"];
            referencedRelation: "propiedades";
            referencedColumns: ["id"];
          },
        ];
      };
      zona_acceso: {
        Row: {
          id: number;
          zona_id: number;
          usuario_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          zona_id: number;
          usuario_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          zona_id?: number;
          usuario_id?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "zona_acceso_zona_id_fkey"; columns: ["zona_id"]; referencedRelation: "zona"; referencedColumns: ["id"] },
          { foreignKeyName: "zona_acceso_usuario_id_fkey"; columns: ["usuario_id"]; referencedRelation: "usuarios"; referencedColumns: ["id"] },
        ];
      };
      configuracion_seguridad: {
        Row: {
          id: number;
          delete_confirmation_password_hash: string | null;
          updated_by: number | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          delete_confirmation_password_hash?: string | null;
          updated_by?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          delete_confirmation_password_hash?: string | null;
          updated_by?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "configuracion_seguridad_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          id: number;
          nombre: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          nombre: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          nombre?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      equipos: {
        Row: {
          id: number;
          empresa_id: number;
          nombre: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          empresa_id: number;
          nombre: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          empresa_id?: number;
          nombre?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipos_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      fincas: {
        Row: {
          id: number;
          numero: string;
          sector_id: number | null;
        };
        Insert: {
          id?: number;
          numero: string;
          sector_id?: number | null;
        };
        Update: {
          id?: number;
          numero?: string;
          sector_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fincas_sector_id_fkey";
            columns: ["sector_id"];
            referencedRelation: "sectores";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos: {
        Row: {
          id: number;
          nombre_cliente: string;
          telefono: string | null;
          tipo_propiedad: string | null;
          zona_deseada: number | null;
          presupuesto: number | null;
          compra_alquiler: boolean | null;
          habitaciones: number | null;
          garaje: boolean | null;
          origen: string | null;
          referencia: string | null;
          caracteristicas: string | null;
          notas: string | null;
          owner_user_id: number | null;
          empresa_id: number | null;
          equipo_id: number | null;
          visibility: string;
        };
        Insert: {
          id?: number;
          nombre_cliente: string;
          telefono?: string | null;
          tipo_propiedad?: string | null;
          zona_deseada?: number | null;
          presupuesto?: number | null;
          compra_alquiler?: boolean | null;
          habitaciones?: number | null;
          garaje?: boolean | null;
          origen?: string | null;
          referencia?: string | null;
          caracteristicas?: string | null;
          notas?: string | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          resultado?: string | null;
        };
        Update: {
          id?: number;
          nombre_cliente?: string;
          telefono?: string | null;
          tipo_propiedad?: string | null;
          zona_deseada?: number | null;
          presupuesto?: number | null;
          compra_alquiler?: boolean | null;
          habitaciones?: number | null;
          garaje?: boolean | null;
          origen?: string | null;
          referencia?: string | null;
          caracteristicas?: string | null;
          notas?: string | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_zona_deseada_fkey";
            columns: ["zona_deseada"];
            referencedRelation: "zona";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_owner_user_id_fkey";
            columns: ["owner_user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      propiedades: {
        Row: {
          id: number;
          planta: string | null;
          puerta: string | null;
          propietario: string | null;
          telefono: string | null;
          estado: string | null;
          fecha_visita: string | null;
          notas: string | null;
          honorarios: number | null;
          posicion: number | null;
          agente_asignado: number | null;
          finca_id: number | null;
          owner_user_id: number | null;
          empresa_id: number | null;
          equipo_id: number | null;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          planta?: string | null;
          puerta?: string | null;
          propietario?: string | null;
          telefono?: string | null;
          estado?: string | null;
          fecha_visita?: string | null;
          notas?: string | null;
          honorarios?: number | null;
          posicion?: number | null;
          agente_asignado?: number | null;
          finca_id?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          planta?: string | null;
          puerta?: string | null;
          propietario?: string | null;
          telefono?: string | null;
          estado?: string | null;
          fecha_visita?: string | null;
          notas?: string | null;
          honorarios?: number | null;
          posicion?: number | null;
          agente_asignado?: number | null;
          finca_id?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "propiedades_agente_asignado_fkey";
            columns: ["agente_asignado"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propiedades_finca_id_fkey";
            columns: ["finca_id"];
            referencedRelation: "fincas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propiedades_owner_user_id_fkey";
            columns: ["owner_user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propiedades_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propiedades_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      sectores: {
        Row: {
          id: number;
          numero: number;
          zona_id: number | null;
        };
        Insert: {
          id?: number;
          numero: number;
          zona_id?: number | null;
        };
        Update: {
          id?: number;
          numero?: number;
          zona_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "sectores_zona_id_fkey";
            columns: ["zona_id"];
            referencedRelation: "zona";
            referencedColumns: ["id"];
          },
        ];
      };
      tareas: {
        Row: {
          id: number;
          titulo: string;
          prioridad: string | null;
          estado: string | null;
          fecha: string | null;
          agente_asignado: number | null;
          owner_user_id: number | null;
          empresa_id: number | null;
          equipo_id: number | null;
          visibility: string;
          resultado: string | null;
        };
        Insert: {
          id?: number;
          titulo: string;
          prioridad?: string | null;
          estado?: string | null;
          fecha?: string | null;
          agente_asignado?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
        };
        Update: {
          id?: number;
          titulo?: string;
          prioridad?: string | null;
          estado?: string | null;
          fecha?: string | null;
          agente_asignado?: number | null;
          owner_user_id?: number | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          visibility?: string;
          resultado?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tareas_agente_asignado_fkey";
            columns: ["agente_asignado"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_owner_user_id_fkey";
            columns: ["owner_user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      rendimiento: {
        Row: {
          id: number;
          agente_id: number;
          anio: number;
          mes: number;
          facturado: number;
          objetivo_facturado: number;
          encargos: number;
          objetivo_encargos: number;
          ventas: number;
          objetivo_ventas: number;
          contactos: number;
          objetivo_contactos: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          agente_id: number;
          anio: number;
          mes?: number;
          facturado?: number;
          objetivo_facturado?: number;
          encargos?: number;
          objetivo_encargos?: number;
          ventas?: number;
          objetivo_ventas?: number;
          contactos?: number;
          objetivo_contactos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          agente_id?: number;
          anio?: number;
          mes?: number;
          facturado?: number;
          objetivo_facturado?: number;
          encargos?: number;
          objetivo_encargos?: number;
          ventas?: number;
          objetivo_ventas?: number;
          contactos?: number;
          objetivo_contactos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rendimiento_agente_id_fkey";
            columns: ["agente_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios: {
        Row: {
          id: number;
          nombre: string;
          apellidos: string;
          rol: string;
          correo: string;
          auth_id: string | null;
          empresa_id: number | null;
          equipo_id: number | null;
          estado: string;
          supervisor_id: number | null;
        };
        Insert: {
          id?: number;
          nombre: string;
          apellidos: string;
          rol?: string;
          correo: string;
          auth_id?: string | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          estado?: string;
          supervisor_id?: number | null;
        };
        Update: {
          id?: number;
          nombre?: string;
          apellidos?: string;
          rol?: string;
          correo?: string;
          auth_id?: string | null;
          empresa_id?: number | null;
          equipo_id?: number | null;
          estado?: string;
          supervisor_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey";
            columns: ["empresa_id"];
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_equipo_id_fkey";
            columns: ["equipo_id"];
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_supervisor_id_fkey";
            columns: ["supervisor_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      zona: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          id?: number;
          nombre: string;
        };
        Update: {
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      rls_auto_enable: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      current_usuario_id: {
        Args: Record<string, never>;
        Returns: number | null;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      current_empresa_id: {
        Args: Record<string, never>;
        Returns: number | null;
      };
      current_equipo_id: {
        Args: Record<string, never>;
        Returns: number | null;
      };
      is_admin_or_director: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_supervised_user_ids: {
        Args: Record<string, never>;
        Returns: number[];
      };
      can_access_scoped_row: {
        Args: {
          row_owner_user_id: number | null;
          row_empresa_id: number | null;
          row_equipo_id: number | null;
          row_visibility: string | null;
        };
        Returns: boolean;
      };
      can_manage_scoped_row: {
        Args: {
          row_owner_user_id: number | null;
          row_empresa_id: number | null;
        };
        Returns: boolean;
      };
      can_view_agent_metrics: {
        Args: {
          target_agente_id: number;
        };
        Returns: boolean;
      };
      can_manage_agent_objectives: {
        Args: {
          target_agente_id: number;
        };
        Returns: boolean;
      };
      insert_desarrollo_activity: {
        Args: {
          target_agente_id: number;
          target_actor_user_id: number | null;
          target_metric: string;
          target_action: string;
          target_source_table: string;
          target_source_id: number;
          target_value?: number;
          target_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      delete_finca_cascade: {
        Args: {
          target_finca_id: number;
        };
        Returns: {
          deleted_propiedades: number;
          deleted_fincas: number;
        }[];
      };
      delete_sector_cascade: {
        Args: {
          target_sector_id: number;
        };
        Returns: {
          deleted_propiedades: number;
          deleted_fincas: number;
          deleted_sectores: number;
        }[];
      };
      delete_zona_cascade: {
        Args: {
          target_zona_id: number;
        };
        Returns: {
          deleted_propiedades: number;
          deleted_fincas: number;
          deleted_sectores: number;
          deleted_zonas: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
