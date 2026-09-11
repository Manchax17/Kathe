import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';

const BUCKET = 'avatars';
const MAX_SIDE = 512;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Recorta la imagen a cuadrado antes de subirla. Los avatares se muestran siempre
 * en círculo, así que recortar en el cliente evita subir megapíxeles que nunca se
 * ven y mantiene el archivo muy por debajo del límite del bucket (2 MiB).
 */
function cropToSquare(file, side = MAX_SIDE) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, side, side);

      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('No se pudo procesar la imagen.')),
        'image/jpeg',
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };

    img.src = url;
  });
}

export default function AvatarUploader({ size = 96 }) {
  const { user, profile, saveProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Elegí un archivo de imagen.');
      return;
    }

    setBusy(true);
    try {
      const blob = await cropToSquare(file);

      if (blob.size > MAX_BYTES) {
        throw new Error('La imagen quedó muy pesada. Probá con otra.');
      }

      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: saveError } = await saveProfile({ avatar_url: publicUrlData.publicUrl });
      if (saveError) throw saveError;
    } catch (err) {
      // El bucket se crea en la migración 0005. Si no se corrió, el error es de
      // Storage y conviene decirlo con todas las letras en vez de fallar mudo.
      setError(
        err.message?.includes('bucket')
          ? 'Falta crear el bucket "avatars" (migración 0005).'
          : err.message || 'No se pudo subir la imagen.',
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar profile={profile} size={size} />
        {busy && (
          <span className="absolute inset-0 rounded-full bg-surface/70 flex items-center justify-center">
            <span
              className="w-6 h-6 rounded-full border-2 border-rule animate-spin"
              style={{ borderTopColor: 'var(--accent)' }}
              aria-hidden
            />
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <label
            className={`cursor-pointer px-4 py-2.5 rounded-xl bg-accent text-sm font-bold shadow-paper transition-all ${
              busy ? 'opacity-60 pointer-events-none' : 'hover:shadow-paper-hover'
            }`}
            style={{ color: 'var(--surface)' }}
          >
            {busy ? 'Subiendo…' : 'Cambiar foto'}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          {profile?.avatar_url && !busy && (
            <button
              type="button"
              onClick={async () => {
                setError('');
                const { error: clearError } = await saveProfile({ avatar_url: null });
                if (clearError) setError(clearError.message);
              }}
              className="px-4 py-2.5 rounded-xl border border-rule text-sm font-bold text-ink-soft hover:bg-app transition-all"
            >
              Quitar
            </button>
          )}
        </div>

        <p className="text-xs text-ink-muted mt-2">
          Se recorta a cuadrado y se guarda en tu carpeta del bucket. Máx 2 MB.
        </p>

        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </div>
    </div>
  );
}
