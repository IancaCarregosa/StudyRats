import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  History,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Sun,
  Target,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { currentWeekRange, formatDuration, formatHM } from '@/lib/time'
import { squareAvatarBlob } from '@/lib/image'
import { getStoredMode, setMode, type ThemeMode } from '@/lib/theme'
import Avatar from '@/components/Avatar'
import Sheet from '@/components/Sheet'
import RhythmChart, { type Daily } from '@/components/RhythmChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Stats = {
  total_minutes: number
  total_sessions: number
  streak: number
  best_streak: number
  week_minutes: number
  today_minutes: number
  goal_minutes: number | null
}

type SheetId = 'name' | 'goal' | 'avatar' | 'theme' | null

const MAX_FILE_MB = 15
const MIN_GOAL = 5
const MAX_GOAL = 720

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
]

const PRESETS = [
  { label: '15 min', total: 15 },
  { label: '30 min', total: 30 },
  { label: '1 h', total: 60 },
  { label: '2 h', total: 120 },
]

function Tile({
  value,
  label,
  hint,
  icon: Icon,
  className = '',
}: {
  value: string
  label: string
  hint: string
  icon: typeof Sun
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-3xl font-bold leading-none">{value}</span>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export default function ProfilePage({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [daily, setDaily] = useState<Daily[]>([])
  const [days, setDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sheet, setSheet] = useState<SheetId>(null)
  const [mode, setLocalMode] = useState<ThemeMode>(getStoredMode())

  // nome
  const [nameDraft, setNameDraft] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // meta
  const [goalH, setGoalH] = useState('0')
  const [goalM, setGoalM] = useState('30')
  const [goalBusy, setGoalBusy] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

  // foto
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Blob | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending])
  useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl) }, [pendingUrl])

  // perfil + estatísticas (uma vez)
  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single(),
      supabase.rpc('get_my_stats'),
    ]).then(([profile, statsRes]) => {
      if (profile.data) {
        setName(profile.data.display_name)
        setAvatarPath(profile.data.avatar_url)
      }
      if (statsRes.error) setError(statsRes.error.message)
      else setStats(((statsRes.data ?? [])[0] ?? null) as Stats | null)
      setLoading(false)
    })
  }, [userId])

  // gráfico (de novo quando troca o período)
  useEffect(() => {
    supabase.rpc('get_daily_minutes', { p_days: days }).then(({ data, error }) => {
      if (error) setError(error.message)
      else setDaily((data ?? []) as Daily[])
    })
  }, [userId, days])

  // ---------- nome ----------
  function openName() {
    setNameDraft(name)
    setNameError(null)
    setSheet('name')
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (trimmed.length < 2) return setNameError('O nome precisa ter pelo menos 2 letras.')
    setNameError(null)
    setNameBusy(true)
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
    setNameBusy(false)
    if (error) return setNameError(error.message)
    setName(trimmed)
    setSheet(null)
  }

  // ---------- meta ----------
  function openGoal() {
    const g = stats?.goal_minutes ?? 30
    setGoalH(String(Math.floor(g / 60)))
    setGoalM(String(g % 60))
    setGoalError(null)
    setSheet('goal')
  }

  const goalDraft = (parseInt(goalH, 10) || 0) * 60 + (parseInt(goalM, 10) || 0)

  async function saveGoal(value: number | null) {
    if (value !== null && (value < MIN_GOAL || value > MAX_GOAL)) {
      return setGoalError('A meta deve ficar entre 5 minutos e 12 horas.')
    }
    setGoalError(null)
    setGoalBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: value })
      .eq('id', userId)
    setGoalBusy(false)
    if (error) return setGoalError(error.message)
    setStats((s) => (s ? { ...s, goal_minutes: value } : s))
    setSheet(null)
  }

  // ---------- foto ----------
  function openAvatar() {
    setPending(null)
    setAvatarError(null)
    setSheet('avatar')
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError(null)
    if (!file.type.startsWith('image/')) return setAvatarError('Escolha um arquivo de imagem.')
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
    if (avatarPath) await bucket.remove([avatarPath])

    setAvatarPath(key)
    setPending(null)
    setAvatarBusy(false)
    setSheet(null)
  }

  async function removeAvatar() {
    if (!avatarPath) return
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
    setSheet(null)
  }

  // ---------- tema ----------
  function chooseMode(m: ThemeMode) {
    setMode(m)
    setLocalMode(m)
    setSheet(null)
  }

  function signOut() {
    if (window.confirm('Sair da conta?')) supabase.auth.signOut()
  }

  if (loading) {
    return <p className="px-6 pt-6 text-sm text-muted-foreground">Carregando...</p>
  }

  const goal = stats?.goal_minutes ?? null
  const today = stats?.today_minutes ?? 0
  const pct = goal ? Math.min(100, Math.round((today / goal) * 100)) : 0
  const goalDone = goal !== null && today >= goal
  const currentMode = MODES.find((m) => m.value === mode) ?? MODES[0]
  const ModeIcon = currentMode.icon
  const streak = stats?.streak ?? 0

  return (
    <div className="flex flex-col gap-6 px-6 pt-6">
      <header>
        <h1 className="text-3xl font-bold leading-tight">Seu perfil</h1>
        <p className="text-sm text-muted-foreground">Seu esforço merece ser visto.</p>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* foto e nome */}
      <section className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <button type="button" onClick={openAvatar} aria-label="Alterar foto" className="relative shrink-0">
          <Avatar path={avatarPath} name={name} size={72} />
          <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
            <Camera className="size-4" />
          </span>
        </button>

        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{name}</p>
          <button
            type="button"
            onClick={openName}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <Pencil className="size-3.5" />
            Editar nome
          </button>
        </div>
      </section>

      {/* meta diária */}
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="size-5" />
            <h2 className="font-semibold">Meta diária</h2>
          </div>
          <button
            type="button"
            onClick={openGoal}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-card px-3 text-sm font-semibold text-primary"
          >
            <Pencil className="size-3.5" />
            {goal ? 'Alterar' : 'Definir'}
          </button>
        </div>

        {goal ? (
          <>
            <div className="mt-4 flex items-end justify-between">
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-bold leading-none">
                  {goal < 60 ? goal : formatHM(goal)}
                </span>
                <span className="text-sm opacity-90">{goal < 60 ? 'min / dia' : '/ dia'}</span>
              </p>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {goalDone ? (
                  <>
                    <Check className="size-4" strokeWidth={3} />
                    Meta concluída!
                  </>
                ) : (
                  `Faltam ${formatDuration(goal - today)}`
                )}
              </p>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/25">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-xs opacity-90">
              {goal < 60 && today < 60
                ? `${today} de ${goal} min hoje`
                : `${formatDuration(today)} de ${formatDuration(goal)} hoje`}
            </p>
          </>
        ) : (
          <p className="mt-4 text-lg font-semibold leading-snug">
            Quanto você quer estudar por dia? Defina uma meta e acompanhe o progresso aqui.
          </p>
        )}
      </section>

      {/* jornada */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Sua jornada</h2>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`}
            label="Sequência atual"
            hint={`Seu recorde: ${stats?.best_streak ?? 0} ${(stats?.best_streak ?? 0) === 1 ? 'dia' : 'dias'}`}
            icon={Flame}
            className="border-primary/20 bg-primary/20"
          />
          <Tile
            value={formatHM(stats?.week_minutes ?? 0)}
            label="Nesta semana"
            hint={currentWeekRange()}
            icon={Clock}
            className="bg-card"
          />
          <Tile
            value={formatHM(stats?.total_minutes ?? 0)}
            label="Tempo total"
            hint="Desde o primeiro estudo"
            icon={History}
            className="bg-card"
          />
          <Tile
            value={String(stats?.total_sessions ?? 0)}
            label="Registros de estudo"
            hint="Cada sessão conta"
            icon={FileText}
            className="border-brand/20 bg-brand/20"
          />
        </div>
      </section>

      {/* gráfico */}
      <RhythmChart data={daily} days={days} onDaysChange={setDays} />

      {/* preferências */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Preferências</h2>
        <div className="divide-y rounded-2xl border bg-card">
          <button
            type="button"
            onClick={() => setSheet('theme')}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <ModeIcon className="size-5 text-primary" />
            <span className="flex-1 font-medium">Tema do app</span>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
              {currentMode.label}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <LogOut className="size-5 text-primary" />
            <span className="flex-1 font-medium">Sair da conta</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* ---------- painéis ---------- */}
      <Sheet open={sheet === 'name'} onClose={() => setSheet(null)} title="Editar nome">
        <form onSubmit={saveName} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Nome de exibição</Label>
            <Input
              id="display-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              required
              autoFocus
            />
          </div>
          {nameError && <p className="text-sm text-red-500">{nameError}</p>}
          <Button type="submit" disabled={nameBusy || nameDraft.trim() === name}>
            {nameBusy ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Sheet>

      <Sheet open={sheet === 'goal'} onClose={() => setSheet(null)} title="Meta diária">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.total}
                type="button"
                size="sm"
                variant={goalDraft === p.total ? 'default' : 'outline'}
                onClick={() => {
                  setGoalH(String(Math.floor(p.total / 60)))
                  setGoalM(String(p.total % 60))
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Quanto você quer estudar por dia?</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                value={goalH}
                onChange={(e) => setGoalH(e.target.value)}
                aria-label="Horas"
              />
              <span className="text-sm">h</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={goalM}
                onChange={(e) => setGoalM(e.target.value)}
                aria-label="Minutos"
              />
              <span className="text-sm">min</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A sequência é independente da meta: um registro de 30 min ou mais já conta o dia.
          </p>

          {goalError && <p className="text-sm text-red-500">{goalError}</p>}

          <div className="flex gap-2">
            <Button onClick={() => saveGoal(goalDraft)} disabled={goalBusy}>
              {goalBusy ? 'Salvando...' : 'Salvar meta'}
            </Button>
            {goal !== null && (
              <Button variant="ghost" onClick={() => saveGoal(null)} disabled={goalBusy}>
                Remover meta
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === 'avatar'} onClose={() => setSheet(null)} title="Foto de perfil">
        <div className="flex flex-col items-center gap-4">
          {pendingUrl ? (
            <img
              src={pendingUrl}
              alt="Pré-visualização da nova foto"
              className="size-32 rounded-full object-cover"
            />
          ) : (
            <Avatar path={avatarPath} name={name} size={128} />
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          {pending ? (
            <>
              <p className="text-xs text-muted-foreground">
                A imagem é recortada no centro, em formato quadrado.
              </p>
              <div className="flex gap-2">
                <Button onClick={saveAvatar} disabled={avatarBusy}>
                  {avatarBusy ? 'Salvando...' : 'Salvar foto'}
                </Button>
                <Button variant="ghost" onClick={() => setPending(null)} disabled={avatarBusy}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={avatarBusy}>
                {avatarPath ? 'Trocar foto' : 'Escolher foto'}
              </Button>
              {avatarPath && (
                <Button variant="ghost" onClick={removeAvatar} disabled={avatarBusy}>
                  Remover foto
                </Button>
              )}
            </div>
          )}

          {avatarError && <p className="text-sm text-red-500">{avatarError}</p>}
        </div>
      </Sheet>

      <Sheet open={sheet === 'theme'} onClose={() => setSheet(null)} title="Tema do app">
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => chooseMode(m.value)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                mode === m.value ? 'border-primary bg-primary/10' : ''
              }`}
            >
              <m.icon className="size-5 text-primary" />
              <span className="flex-1 font-medium">{m.label}</span>
              {mode === m.value && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}