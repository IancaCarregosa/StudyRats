import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/time'
import { Button } from '@/components/ui/button'

type Group = { id: string; name: string }
type Period = 'week' | 'month'
type Row = {
  user_id: string
  display_name: string
  avatar_url: string | null
  total_minutes: number
  sessions: number
}

export default function RankingPage({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [scope, setScope] = useState<string>('global') // 'global' ou id do grupo
  const [period, setPeriod] = useState<Period>('week')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('group_members')
      .select('group:groups(id, name)')
      .eq('user_id', userId)
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGroups((data ?? []).map((r: any) => r.group).filter(Boolean) as Group[])
      })
  }, [userId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .rpc('get_ranking', {
        p_period: period,
        p_group_id: scope === 'global' ? null : scope,
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setRows((data ?? []) as Row[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope, period])

  // posição com empate: mesmos minutos = mesma posição
  const positions: number[] = []
  rows.forEach((r, i) => {
    positions.push(i > 0 && r.total_minutes === rows[i - 1].total_minutes ? positions[i - 1] : i + 1)
  })

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        aria-label="Escolher ranking"
      >
        <option value="global">Ranking global</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={period === 'week' ? 'default' : 'outline'}
          onClick={() => setPeriod('week')}
        >
          Semana
        </Button>
        <Button
          size="sm"
          variant={period === 'month' ? 'default' : 'outline'}
          onClick={() => setPeriod('month')}
        >
          Mês
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {period === 'week' ? 'Desde a última segunda-feira.' : 'Desde o dia 1 deste mês.'}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém registrou estudo neste período.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const me = r.user_id === userId
            return (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${me ? 'border-primary' : ''}`}
              >
                <span className="w-6 text-center font-mono text-sm">{positions[i]}</span>
                <div className="flex-1">
                  <p className={`text-sm ${me ? 'font-bold' : 'font-medium'}`}>
                    {r.display_name}
                    {me && ' (você)'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.sessions} {r.sessions === 1 ? 'registro' : 'registros'}
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {r.total_minutes > 0 ? formatDuration(r.total_minutes) : '0 min'}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}