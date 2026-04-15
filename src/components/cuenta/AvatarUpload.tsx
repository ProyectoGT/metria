"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase-browser";
import { saveAvatarUrlAction } from "@/app/actions/perfil";

type Props = {
  userId: string;
  userName: string;
  initialAvatarUrl: string | null;
};

export default function AvatarUpload({
  userId,
  userName,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = pendingFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const result = await saveAvatarUrlAction(publicUrl);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setPendingFile(null);
      setPreviewUrl(publicUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={userName}
            className="h-20 w-20 rounded-full object-cover border border-border"
          />
        ) : (
          <Avatar name={userName} size="lg" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelect}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-background"
          >
            <Camera className="h-4 w-4" />
            Cambiar foto
          </button>
          {pendingFile && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Subiendo..." : "Guardar foto"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          PNG o JPG, máximo 5 MB.
        </p>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
