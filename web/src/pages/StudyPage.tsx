import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TAGS, tagLabel } from '@/lib/tags'
import { formatDuration } from '@/lib/time'
import CameraCapture from '@/components/CameraCapture'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Step = 'details' | 'front' | 'back' | 'review'
type Group = { id: string; name: string }

const MAX_MINUTES = 720 // 12 horas, mesmo limite do banco

export default function StudyPage({
  userId,
  onPublished,
}: {
  userId: string
  onPublished?: () => void
}) {
  const [step, setStep] = useState<Step>('details')

  // dados do registro
  const [logId, setLogId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<string>(TAGS[0].value)
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const [front, setFront] = useState<Blob | null>(null)
  const [back, setBack] = useState<Blob | null>(null)

  // grupos
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<string[]>([])

  // estado da tela
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)

  const totalMinutes = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0)

  const frontUrl = useMemo(() => (front ? URL.createObjectURL(front) : null), [front])
  const backUrl = useMemo(() => (back ? URL.createObjectURL(back) : null), [back])
  useEffect(() => () => { if (frontUrl) URL.revokeObjectURL(frontUrl) }, [frontUrl])
  useEffect(() => () => { if (backUrl) URL.revokeObjectURL(backUrl) }, [backUrl])

  // carrega os grupos do usuário (todos começam marcados)
  useEffect(() => {
    supabase
      .from('group_members')
      .select('group:groups(id, name)')
      .eq('user_id', userId)
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (data ?? []).map((r: any) => r.group).filter(Boolean) as Group[]
        setGroups(list)
        setSelected(list.map((g) => g.id))
      })
  }, [userId])

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function handleDetails(e: React.FormEvent) {
    e.preventDefault()
    if (totalMinutes < 1 || totalMinutes > MAX_MINUTES) {
      return setError('Informe uma duração entre 1 minuto e 12 horas.')
    }
    setError(null)
    setDoneMsg(null)
    setStep('front')
  }

  function resetAll() {
    setLogId(crypto.randomUUID())
    setTitle('')
    setTag(TAGS[0].value)
    setHours('0')
    setMinutes('30')
    setFront(null)
    setBack(null)
    setError(null)
    setStep('details')
  }

  async function publish() {
    if (!front || !back) return
    setError(null)
    setBusy(true)

    const base = `${userId}/${logId}`
    const frontKey = `${base}/front.jpg`
    const backKey = `${base}/back.jpg`
    const bucket = supabase.storage.from('study-photos')

    // upsert: se uma tentativa anterior falhou no meio, reenviar não dá erro
    const up1 = await bucket.upload(frontKey, front, { contentType: 'image/jpeg', upsert: true })
    if (up1.error) {
      setBusy(false)
      return setError(`Falha ao enviar a foto da frente: ${up1.error.message}`)
    }
    const up2 = await bucket.upload(backKey, back, { contentType: 'image/jpeg', upsert: true })
    if (up2.error) {
      setBusy(false)
      return setError(`Falha ao enviar a foto de trás: ${up2.error.message}`)
    }

    const { error } = await supabase.rpc('create_study_log', {
      p_id: logId,
      p_title: title,
      p_tag: tag,
      p_duration_minutes: totalMinutes,
      p_front_key: frontKey,
      p_back_key: backKey,
      p_group_ids: selected,
    })

    setBusy(false)
    if (error) return setError(error.message)

    const saved = formatDuration(totalMinutes)
    resetAll()
    setDoneMsg(`Registro publicado: ${saved} de estudo.`)
    onPublished?.()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      {doneMsg && <div className="rounded-lg border p-3 text-sm">{doneMsg}</div>}

      {/* PASSO 1: detalhes */}
      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar estudo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetails} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">O que você estudou?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Inglês, capítulo 4"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tag">Categoria</Label>
                <select
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {TAGS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Quanto tempo?</Label>
                <p className="text-xs text-muted-foreground">
                  Registros de 30 min ou mais contam para a sua sequência.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={12}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    aria-label="Horas"
                  />
                  <span className="text-sm">h</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    aria-label="Minutos"
                  />
                  <span className="text-sm">min</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit">Continuar para as fotos</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PASSO 2: foto frontal */}
      {step === 'front' && (
        <div className="flex flex-col gap-3">
          <CameraCapture
            facing="user"
            label="Foto 1 de 2: você (câmera frontal)"
            onCapture={(b) => {
              setFront(b)
              setStep('back')
            }}
          />
          <Button variant="ghost" onClick={() => setStep('details')}>
            Voltar
          </Button>
        </div>
      )}

      {/* PASSO 3: foto traseira */}
      {step === 'back' && (
        <div className="flex flex-col gap-3">
          <CameraCapture
            facing="environment"
            label="Foto 2 de 2: o ambiente (câmera traseira)"
            onCapture={(b) => {
              setBack(b)
              setStep('review')
            }}
          />
          <Button variant="ghost" onClick={() => setStep('front')}>
            Refazer foto anterior
          </Button>
        </div>
      )}

      {/* PASSO 4: revisar e publicar */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Revisar e publicar</CardTitle>
            <p className="text-sm text-muted-foreground">
              {title} · {tagLabel(tag)} · {formatDuration(totalMinutes)}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              {frontUrl && (
                <img src={frontUrl} alt="Foto frontal" className="aspect-[3/4] w-full rounded-lg object-cover" />
              )}
              {backUrl && (
                <img src={backUrl} alt="Foto traseira" className="aspect-[3/4] w-full rounded-lg object-cover" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Publicar nos grupos:</p>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você não está em nenhum grupo. O registro conta só para você.
                </p>
              ) : (
                groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={() => toggle(g.id)}
                    />
                    {g.name}
                  </label>
                ))
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={publish} disabled={busy}>
                {busy ? 'Enviando...' : 'Publicar'}
              </Button>
              <Button variant="ghost" onClick={() => setStep('front')} disabled={busy}>
                Refazer fotos
              </Button>
              <Button variant="ghost" onClick={() => setStep('details')} disabled={busy}>
                Editar dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}