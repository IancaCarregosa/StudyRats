import { useEffect, useState } from 'react'
import { Bell, Link2, Play, Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateHeader, formatDuration } from '@/lib/time'
import Mascot from '@/components/Mascot'
import StreakCard, { type WeekDay } from '@/components/StreakCard'
import FeedSection from '@/components/FeedSection'
import { Button } from '@/components/ui/button'

type HomeStats = {
  streak: number
  best_streak: number
  today_minutes: number
  goal_minutes: number | null
}

function goalLine(s: HomeStats | null) {
  if (!s || !s.goal_minutes) return 'Defina uma meta diária no seu perfil.'
  if (s.today_minutes >= s.goal_minutes) return 'Meta de hoje concluída. Bom trabalho!'
  if (s.today_minutes > 0) {
    return `Faltam ${formatDuration(s.goal_minutes - s.today_minutes)} para a meta de hoje.`
  }
  return `Sua meta de hoje: ${formatDuration(s.goal_minutes)} de foco.`
}

type Props = {
  userId: string
  unread: number
  onOpenNotifications: () => void
  onStart: () => void
  onGoGroups: (focus?: 'create' | 'join') => void
}

export default function HomePage({
  userId,
  unread,
  onOpenNotifications,
  onStart,
  onGoGroups,
}: Props) {
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [week, setWeek] = useState<WeekDay[]>([])

  useEffect(() => {
    Promise.all([supabase.rpc('get_my_stats'), supabase.rpc('get_week_days')]).then(([s, w]) => {
      setStats(((s.data ?? [])[0] ?? null) as HomeStats | null)
      setWeek((w.data ?? []) as WeekDay[])
    })
  }, [userId])

  return (
    <div className="flex flex-col gap-6 px-6 pt-6">
      {/* cabeçalho */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-light uppercase tracking-wide text-muted-foreground">
            {formatDateHeader()}
          </p>
          <h1 className="text-2xl font-bold leading-tight">Oi, que bom te ver!</h1>
        </div>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={unread > 0 ? `Notificações (${unread} novas)` : 'Notificações'}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border bg-card"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-brand ring-2 ring-card" />
          )}
        </button>
      </header>

      {/* sequência */}
      <StreakCard streak={stats?.streak ?? 0} best={stats?.best_streak ?? 0} week={week} />

      {/* próximo passo */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="relative z-10 flex max-w-[62%] flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            Seu próximo passo
          </p>
          <h2 className="text-2xl font-bold leading-tight mb-2">
            Seu progresso começa agora.
          </h2>
          <p className="text-sm opacity-90">{goalLine(stats)}</p>
          <button
            type="button"
            onClick={onStart}
            className="mt-3 inline-flex h-11 items-center gap-2 self-start rounded-xl bg-card px-4 text-sm font-semibold text-primary"
          >
            <Play className="size-4" />
            Começar a estudar
          </button>
        </div>
        <Mascot className="absolute -right-0 top-1/2 h-32 w-auto -translate-y-1/2" />
      </div>

      {/* feed */}
      <FeedSection userId={userId} />

      {/* grupos */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Modo coletivo</h2>
          <button
            type="button"
            onClick={() => onGoGroups()}
            className="text-sm font-medium text-primary"
          >
            Ver todos
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand">
              <Users className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Bora estudar em grupo?</p>
              <p className="text-sm text-muted-foreground">
                Mais desafios, mais evolução.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button className="h-11 rounded-xl" onClick={() => onGoGroups('create')}>
              <Plus className="size-4" />
              Criar grupo
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => onGoGroups('join')}>
              <Link2 className="size-4" />
              Usar código
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}