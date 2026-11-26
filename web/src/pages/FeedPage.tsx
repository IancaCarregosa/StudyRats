import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { tagLabel } from '@/lib/tags'
import { formatDuration, timeAgo } from '@/lib/time'
import Comments from '@/components/Comments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const PAGE_SIZE = 10

type Group = { id: string; name: string }

type FeedItem = {
  id: string
  user_id: string
  title: string
  tag: string
  duration_minutes: number
  front_photo_key: string
  back_photo_key: string
  created_at: string
  profiles: { display_name: string } | null
  comments: { count: number }[]
}

export default function FeedPage({ userId }: { userId: string }) {
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

  // quais grupos entram na consulta
  const ids = useMemo(
    () => (filter === 'all' ? groups.map((g) => g.id) : [filter]),
    [groups, filter]
  )

  // busca uma página do feed e gera as URLs assinadas das fotos
  async function fetchPage(offset: number) {
    const { data, error } = await supabase
      .from('study_logs')
      .select(
        'id, user_id, title, tag, duration_minutes, front_photo_key, back_photo_key, created_at, profiles(display_name), comments(count), study_log_groups!inner(group_id)'
      )
      .in('study_log_groups.group_id', ids)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const page = (data ?? []) as unknown as FeedItem[]

    const keys = page.flatMap((i) => [i.front_photo_key, i.back_photo_key])
    if (keys.length > 0) {
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
    // remove as fotos do storage (melhor esforço)
    await supabase.storage.from('study-photos').remove([item.front_photo_key, item.back_photo_key])
    setItems((cur) => cur.filter((i) => i.id !== item.id))
  }

  if (!groupsLoaded || loading) {
    return <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      {groups.length > 1 && (
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          aria-label="Filtrar por grupo"
        >
          <option value="all">Todos os grupos</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Entre em um grupo (aba Grupos) para ver os registros dos seus amigos.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum registro ainda. Seja o primeiro a estudar hoje.
        </p>
      ) : (
        items.map((item) => {
          const frontUrl = urls[item.front_photo_key]
          const backUrl = urls[item.back_photo_key]
          return (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.profiles?.display_name ?? 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                  </div>
                  {item.user_id === userId && (
                    <Button size="sm" variant="ghost" onClick={() => deletePost(item)}>
                      Apagar
                    </Button>
                  )}
                </div>

                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                  {backUrl && (
                    <img src={backUrl} alt="Foto do ambiente" className="h-full w-full object-cover" />
                  )}
                  {frontUrl && (
                    <img
                      src={frontUrl}
                      alt="Foto do estudante"
                      className="absolute left-2 top-2 w-1/3 rounded-md border-2 border-white object-cover"
                    />
                  )}
                </div>

                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tagLabel(item.tag)} · {formatDuration(item.duration_minutes)}
                  </p>
                </div>

                <Comments
                  logId={item.id}
                  userId={userId}
                  initialCount={item.comments?.[0]?.count ?? 0}
                />
              </CardContent>
            </Card>
          )
        })
      )}

      {hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Carregando...' : 'Carregar mais'}
        </Button>
      )}
    </div>
  )
}   