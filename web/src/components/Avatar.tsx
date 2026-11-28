import { supabase } from '@/lib/supabase'

// Mostra a foto do usuário; sem foto, mostra a inicial do nome.
// "path" é a chave guardada em profiles.avatar_url.
export default function Avatar({
  path,
  name,
  size = 40,
}: {
  path: string | null | undefined
  name: string
  size?: number
}) {
  const style = { width: size, height: size }

  if (path) {
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-muted font-medium"
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}