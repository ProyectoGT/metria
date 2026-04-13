export interface Database {
  public: {
    Tables: {
      agenda: {
        Row: {
          id: number;
          description: string;
          event_date: string;
          time: string | null;
          priority: string;
          completed: boolean;
          result: string | null;
          gcal_event_id: string | null;
          user_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          description: string;
          event_date: string;
          time?: string | null;
          priority?: string;
          completed?: boolean;
          result?: string | null;
          gcal_event_id?: string | null;
          user_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          description?: string;
          event_date?: string;
          time?: string | null;
          priority?: string;
          completed?: boolean;
          result?: string | null;
          gcal_event_id?: string | null;
          user_id?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      archivos: {
        Row: {
          id: number;
          nombre: string;
          propiedad_id: number | null;
        };
        Insert: {
          id?: number;
          nombre: string;
          propiedad_id?: number | null;
        };
        Update: {
          id?: number;
          nombre?: string;
          propiedad_id?: number | null;
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
      fincas: {
        Row: {
          id: number;
          numero: number;
          sector_id: number | null;
        };
        Insert: {
          id?: number;
          numero: number;
          sector_id?: number | null;
        };
        Update: {
          id?: number;
          numero?: number;
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
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_zona_deseada_fkey";
            columns: ["zona_deseada"];
            referencedRelation: "zona";
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
          agente_asignado: number | null;
          finca_id: number | null;
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
          agente_asignado?: number | null;
          finca_id?: number | null;
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
          agente_asignado?: number | null;
          finca_id?: number | null;
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
          agente_asignado: number | null;
        };
        Insert: {
          id?: number;
          titulo: string;
          prioridad?: string | null;
          estado?: string | null;
          agente_asignado?: number | null;
        };
        Update: {
          id?: number;
          titulo?: string;
          prioridad?: string | null;
          estado?: string | null;
          agente_asignado?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tareas_agente_asignado_fkey";
            columns: ["agente_asignado"];
            referencedRelation: "usuarios";
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
          puesto: string;
          correo: string;
          auth_id: string | null;
        };
        Insert: {
          id?: number;
          nombre: string;
          apellidos: string;
          puesto?: string;
          correo: string;
          auth_id?: string | null;
        };
        Update: {
          id?: number;
          nombre?: string;
          apellidos?: string;
          puesto?: string;
          correo?: string;
          auth_id?: string | null;
        };
        Relationships: [];
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
    };
    Enums: Record<string, never>;
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
