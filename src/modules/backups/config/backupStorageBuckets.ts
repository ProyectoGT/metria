export type StorageCompanyStrategy = "via_archivos_table" | "via_user_folders";

export type BackupStorageBucketDefinition = {
  bucket: string;
  label: string;
  enabled: boolean;
  critical: boolean;
  companyStrategy: StorageCompanyStrategy;
  linkedEntity: string;
  excludePatterns: string[];
  note?: string;
};

/**
 * Buckets de Supabase Storage que se incluyen en el backup.
 * Los buckets de backup (backups-privado) están explícitamente excluidos.
 */
export const BACKUP_STORAGE_BUCKETS: BackupStorageBucketDefinition[] = [
  {
    bucket: "encargo-archivos",
    label: "Documentos e imagenes de propiedades",
    enabled: true,
    critical: true,
    companyStrategy: "via_archivos_table",
    linkedEntity: "archivos",
    excludePatterns: [],
    note:
      "Documentos PDF e imagenes subidos a encargos. Filtrados por empresa via tabla archivos.",
  },
  {
    bucket: "avatars",
    label: "Avatares de usuarios",
    enabled: true,
    critical: false,
    companyStrategy: "via_user_folders",
    linkedEntity: "usuarios",
    excludePatterns: [],
    note:
      "Fotos de perfil de usuarios. Filtradas por empresa via tabla usuarios.",
  },
];

export function getEnabledStorageBuckets(): BackupStorageBucketDefinition[] {
  return BACKUP_STORAGE_BUCKETS.filter((b) => b.enabled);
}
