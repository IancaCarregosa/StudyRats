import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  profiles: { display_name: string } | null
}

export default function Comments({
  logId,
  userId,
  initialCount,
}: {
  logId: string
  userId: string
  initialCount: number
}) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('id, body, created_at, user_id, profiles(display_name)')
      .eq('study_log_id', logId)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (error) return setError(error.message)
    const list = (data ?? []) as unknown as Comment[]
    setComments(list)
    setCount(list.length)
  }, [logId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setError(null)
    setSending(true)
    const { error } = await supabase
      .from('comments')
      .insert({ study_log_id: logId, user_id: userId, body: body.trim() })
    setSending(false)
    if (error) return setError(error.message)
    setBody('')
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) return setError(error.message)
    load()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="self-start text-sm text-muted-foreground underline"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Esconder comentários' : `Comentários (${count})`}
      </button>

      {open && (
        <div className="flex flex-col gap-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <p>
                <strong>{c.profiles?.display_name ?? 'Usuário'}</strong>{' '}
                <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
              </p>
              <p>{c.body}</p>
              {c.user_id === userId && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => remove(c.id)}
                >
                  Apagar
                </button>
              )}
            </div>
          ))}

          <form onSubmit={send} className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva um comentário"
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={sending || !body.trim()}>
              Enviar
            </Button>
          </form>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}