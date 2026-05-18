"use client";

import { useRef, useState } from "react";
import Image from "next/image";
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
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="group relative shrink-0">
        <div className="relative h-24 w-24">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={userName}
              width={96}
              height={96}
              unoptimized
              className="h-full w-full rounded-full border-2 border-border object-cover ring-2 ring-primary/5"
            />
          ) : (
            <Avatar name={userName} size="xl" />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 transition-colors hover:bg-black/20"
            aria-label="Cambiar foto"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start sm:pt-1">
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-background"
          >
            <Camera className="h-4 w-4" />
            Cambiar foto
          </button>
          {pendingFile && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Subiendo..." : "Guardar foto"}
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary">
          PNG o JPG, máximo 5 MB
        </p>
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
