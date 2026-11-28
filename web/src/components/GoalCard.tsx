import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MIN_GOAL = 5
const MAX_GOAL = 720

export default function GoalCard({ userId }: { userId: string }) {
  const [goal, setGoal] = useState<number | null>(null)
  const [today, setToday] = useState(0)
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('get_my_stats').then(({ data }) => {
      const st = (data ?? [])[0]
      if (st) {
        setGoal(st.goal_minutes)
        setToday(st.today_minutes)
        if (st.goal_minutes) {
          setHours(String(Math.floor(st.goal_minutes / 60)))
          setMinutes(String(st.goal_minutes % 60))
        }
      }
      setLoading(false)
    })
  }, [userId])

  const total = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (total < MIN_GOAL || total > MAX_GOAL) {
      return setError('A meta deve ficar entre 5 minutos e 12 horas.')
    }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: total })
      .eq('id', userId)
    setSaving(false)
    if (error) return setError(error.message)
    setGoal(total)
    setMessage('Meta atualizada.')
  }

  async function remove() {
    setError(null)
    setMessage(null)
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: null })
      .eq('id', userId)
    setSaving(false)
    if (error) return setError(error.message)
    setGoal(null)
    setMessage('Meta removida.')
  }

  const pct = goal ? Math.min(100, Math.round((today / goal) * 100)) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meta diária</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {goal ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  Hoje: {formatDuration(today)} de {formatDuration(goal)}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você ainda não definiu uma meta. Ela aparece na sua home todos os dias.
              </p>
            )}

            <form onSubmit={save} className="flex flex-col gap-3">
              <Label>Quanto você quer estudar por dia?</Label>
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

              <p className="text-xs text-muted-foreground">
                A sequência é independente da meta: um registro de 30 min ou mais já conta o dia.
              </p>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {message && <p className="text-sm text-muted-foreground">{message}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar meta'}
                </Button>
                {goal && (
                  <Button type="button" variant="ghost" onClick={remove} disabled={saving}>
                    Remover meta
                  </Button>
                )}
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}