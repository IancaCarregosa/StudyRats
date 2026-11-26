import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/time'
import { squareAvatarBlob } from '@/lib/image'
import Avatar from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Stats = {
  total_minutes: number
  total_sessions: number
  streak: number
  week_minutes: number
}
type Daily = { day: string; minutes: number }

const MAX_FILE_MB = 15

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

export default function ProfilePage({
  userId,
  onNameChange,
  onAvatarChange,
}: {
  userId: string
  onNameChange?: (name: string) => void
  onAvatarChange?: (path: string | null) => void
}) {
  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [daily, setDaily] = useState<Daily[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // avatar
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Blob | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending])
  useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl) }, [pendingUrl])

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single(),
      supabase.rpc('get_my_stats'),
      supabase.rpc('get_daily_minutes', { p_days: 14 }),
    ]).then(([profile, statsRes, dailyRes]) => {
      if (profile.data) {
        setName(profile.data.display_name)
        setSavedName(profile.data.display_name)
        setAvatarPath(profile.data.avatar_url)
      }
      if (statsRes.error) setError(statsRes.error.message)
      else setStats(((statsRes.data ?? [])[0] ?? null) as Stats | null)
      if (dailyRes.error) setError(dailyRes.error.message)
      else setDaily((dailyRes.data ?? []) as Daily[])
      setLoading(false)
    })
  }, [userId])

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSaving(true)
    const trimmed = name.trim()
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
    setSaving(false)
    if (error) return setError(error.message)
    setSavedName(trimmed)
    setMessage('Nome atualizado.')
    onNameChange?.(trimmed)
  }

  // ---------- avatar ----------
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return

    setAvatarError(null)
    if (!file.type.startsWith('image/')) {
      return setAvatarError('Escolha um arquivo de imagem.')
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return setAvatarError(`Imagem muito grande (máximo ${MAX_FILE_MB} MB).`)
    }
    try {
      setPending(await squareAvatarBlob(file))
    } catch {
      setAvatarError('Não foi possível ler essa imagem.')
    }
  }

  async function saveAvatar() {
    if (!pending) return
    setAvatarError(null)
    setAvatarBusy(true)

    const key = `${userId}/${Date.now()}.jpg`
    const bucket = supabase.storage.from('avatars')

    const up = await bucket.upload(key, pending, { contentType: 'image/jpeg' })
    if (up.error) {
      setAvatarBusy(false)
      return setAvatarError(`Falha no envio: ${up.error.message}`)
    }

    const { error } = await supabase.from('profiles').update({ avatar_url: key }).eq('id', userId)
    if (error) {
      await bucket.remove([key])
      setAvatarBusy(false)
      return setAvatarError(error.message)
    }

    // apaga a foto anterior (melhor esforço)
    if (avatarPath) await bucket.remove([avatarPath])

    setAvatarPath(key)
    setPending(null)
    setAvatarBusy(false)
    onAvatarChange?.(key)
  }

  async function removeAvatar() {
    if (!avatarPath || !window.confirm('Remover sua foto de perfil?')) return
    setAvatarError(null)
    setAvatarBusy(true)

    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    if (error) {
      setAvatarBusy(false)
      return setAvatarError(error.message)
    }
    await supabase.storage.from('avatars').remove([avatarPath])

    setAvatarPath(null)
    setAvatarBusy(false)
    onAvatarChange?.(null)
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
  }

  const chartData = daily.map((d) => ({
    label: `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`,
    minutes: d.minutes,
  }))

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      {/* FOTO DE PERFIL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seu perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {pendingUrl ? (
              <img
                src={pendingUrl}
                alt="Pré-visualização da nova foto"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <Avatar path={avatarPath} name={savedName} size={96} />
            )}

            <div className="flex flex-col gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              {pending ? (
                <>
                  <Button size="sm" onClick={saveAvatar} disabled={avatarBusy}>
                    {avatarBusy ? 'Salvando...' : 'Salvar foto'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPending(null)}
                    disabled={avatarBusy}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                    disabled={avatarBusy}
                  >
                    {avatarPath ? 'Trocar foto' : 'Escolher foto'}
                  </Button>
                  {avatarPath && (
                    <Button size="sm" variant="ghost" onClick={removeAvatar} disabled={avatarBusy}>
                      Remover foto
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {pending && (
            <p className="text-xs text-muted-foreground">
              A imagem é recortada no centro, em formato quadrado.
            </p>
          )}
          {avatarError && <p className="text-sm text-red-500">{avatarError}</p>}

          <hr className="border-t" />

          <form onSubmit={saveName} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="display-name">Nome de exibição</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={40}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={saving || name.trim() === savedName}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          label="Sequência"
          value={`${stats?.streak ?? 0} ${(stats?.streak ?? 0) === 1 ? 'dia' : 'dias'}`}
        />
        <StatBox label="Esta semana" value={formatDuration(stats?.week_minutes ?? 0)} />
        <StatBox label="Total estudado" value={formatDuration(stats?.total_minutes ?? 0)} />
        <StatBox label="Registros" value={String(stats?.total_sessions ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 14 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                <Tooltip
                  formatter={(v) => [formatDuration(Number(v)), 'Estudo']}
                  cursor={{ fillOpacity: 0.1 }}
                />
                <Bar dataKey="minutes" fill="#7546F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}