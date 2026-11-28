import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FeedCard, { type FeedItem } from '@/components/FeedCard'
import type { CommentItem } from '@/components/Comments'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 10

type Group = { id: string; name: string }

export default function FeedSection({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const [items, setItems] = useState<FeedItem[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1) grupos do usuário
  useEffect(() => {
    supabase
      .from('group_members')
      .select('group:groups(id, name)')
      .eq('user_id', userId)
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGroups((data ?? []).map((r: any) => r.group).filter(Boolean) as Group[])
        setGroupsLoaded(true)
      })
  }, [userId])

  const ids = useMemo(
    () => (filter === 'all' ? groups.map((g) => g.id) : [filter]),
    [groups, filter]
  )

  // busca uma página: registros + último comentário de cada um + URLs assinadas das fotos
  async function fetchPage(offset: number) {
    const { data, error } = await supabase
      .from('study_logs')
      .select(
        'id, user_id, title, tag, duration_minutes, front_photo_key, back_photo_key, created_at, profiles(display_name, avatar_url), comments(count), study_log_groups!inner(group_id)'
      )
      .in('study_log_groups.group_id', ids)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const page = (data ?? []) as unknown as FeedItem[]

    if (page.length > 0) {
      // último comentário de cada registro (para a prévia do card)
      const { data: cs } = await supabase
        .from('comments')
        .select('id, study_log_id, body, created_at, user_id, profiles(display_name, avatar_url)')
        .in('study_log_id', page.map((i) => i.id))
        .order('created_at', { ascending: false })
        .limit(200)

      const lastBy: Record<string, CommentItem> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(cs ?? []).forEach((c: any) => {
        if (!lastBy[c.study_log_id]) lastBy[c.study_log_id] = c as CommentItem
      })
      page.forEach((i) => {
        i.last_comment = lastBy[i.id] ?? null
      })

      const keys = page.flatMap((i) => [i.front_photo_key, i.back_photo_key])
      const { data: signed } = await supabase.storage
        .from('study-photos')
        .createSignedUrls(keys, 3600)
      const map: Record<string, string> = {}
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl
      })
      setUrls((cur) => ({ ...cur, ...map }))
    }
    return page
  }

  // 2) primeira página (e sempre que o filtro muda)
  useEffect(() => {
    if (!groupsLoaded) return
    if (ids.length === 0) {
      setItems([])
      setHasMore(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchPage(0)
      .then((page) => {
        setItems(page)
        setHasMore(page.length === PAGE_SIZE)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsLoaded, ids])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const page = await fetchPage(items.length)
      setItems((cur) => [...cur, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoadingMore(false)
  }

  async function deletePost(item: FeedItem) {
    if (!window.confirm('Apagar este registro?')) return
    const { error } = await supabase.from('study_logs').delete().eq('id', item.id)
    if (error) return setError(error.message)
    await supabase.storage.from('study-photos').remove([item.front_photo_key, item.back_photo_key])
    setItems((cur) => cur.filter((i) => i.id !== item.id))
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Na sua rede</h2>
          <p className="text-sm text-muted-foreground">Um pouco de inspiração dos seus amigos.</p>
        </div>

        <div className="relative shrink-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar por grupo"
            className="h-8 max-w-36 appearance-none rounded-full border bg-card pl-3 pr-8 text-xs font-semibold text-primary"
          >
            <option value="all">Amigos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-primary" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!groupsLoaded || loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Entre em um grupo para ver os registros dos seus amigos.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum registro ainda. Seja o primeiro a estudar hoje.
        </p>
      ) : (
        items.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            frontUrl={urls[item.front_photo_key]}
            backUrl={urls[item.back_photo_key]}
            userId={userId}
            onDelete={deletePost}
          />
        ))
      )}

      {hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Carregando...' : 'Carregar mais'}
        </Button>
      )}
    </section>
  )
}