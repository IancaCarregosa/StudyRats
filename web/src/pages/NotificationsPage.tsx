import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/time'
import Avatar from '@/components/Avatar'

type Notif = {
  id: string
  read_at: string | null
  created_at: string
  actor: { display_name: string; avatar_url: string | null } | null
  study_log: { title: string } | null
  comment: { body: string } | null
}

export default function NotificationsPage({
  userId,
  onBack,
  onChanged,
}: {
  userId: string
  onBack: () => void
  onChanged: () => void // avisa o app para atualizar o contador do sino
}) {
  const [items, setItems] = useState<Notif[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, read_at, created_at, actor:profiles!actor_id(display_name, avatar_url), study_log:study_logs(title), comment:comments(body)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return
      setLoading(false)
      if (error) return setError(error.message)

      const list = (data ?? []) as unknown as Notif[]
      setItems(list)

      // guarda quais eram novas (para destacar nesta visita) e marca tudo como lido
      const fresh = list.filter((n) => !n.read_at).map((n) => n.id)
      setUnreadIds(new Set(fresh))
      if (fresh.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('read_at', null)
        if (!cancelled) onChanged()
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <div className="flex flex-col gap-4 px-6 pt-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Notificações</h1>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma notificação ainda. Quando alguém comentar nos seus registros, aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const name = n.actor?.display_name ?? 'Alguém'
            const isNew = unreadIds.has(n.id)
            return (
              <li
                key={n.id}
                className={`flex gap-3 rounded-2xl border p-3 ${isNew ? 'bg-accent' : 'bg-card'}`}
              >
                <Avatar path={n.actor?.avatar_url} name={name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{name}</span> comentou no seu registro
                    {n.study_log?.title ? (
                      <span className="text-muted-foreground"> &quot;{n.study_log.title}&quot;</span>
                    ) : null}
                  </p>
                  {n.comment?.body && (
                    <p className="mt-1 line-clamp-3 break-words text-sm text-muted-foreground">
                      {n.comment.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
                {isNew && <span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}