import { useState } from 'react'
import { Clock, MessageCircle, MoreHorizontal } from 'lucide-react'
import { tagLabel } from '@/lib/tags'
import { formatDuration, formatPostTime } from '@/lib/time'
import Avatar from '@/components/Avatar'
import Comments, { type CommentItem } from '@/components/Comments'

export type FeedItem = {
  id: string
  user_id: string
  title: string
  tag: string
  duration_minutes: number
  front_photo_key: string
  back_photo_key: string
  created_at: string
  profiles: { display_name: string; avatar_url: string | null } | null
  comments: { count: number }[]
  last_comment?: CommentItem | null
}

type Props = {
  item: FeedItem
  frontUrl?: string
  backUrl?: string
  userId: string
  onDelete: (item: FeedItem) => void
}

export default function FeedCard({ item, frontUrl, backUrl, userId, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [count, setCount] = useState(item.comments?.[0]?.count ?? 0)

  const name = item.profiles?.display_name ?? 'Usuário'
  const mine = item.user_id === userId

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      {/* cabeçalho */}
      <div className="flex items-center gap-3">
        <Avatar path={item.profiles?.avatar_url} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{formatPostTime(item.created_at)}</p>
        </div>

        {mine && (
          <div className="relative">
            <button
              type="button"
              aria-label="Mais opções"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground"
            >
              <MoreHorizontal className="size-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border bg-popover p-1 shadow-lg">
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(item)
                    }}
                  >
                    Apagar registro
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* fotos: ambiente em destaque, selfie no canto */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
        {backUrl && (
          <img src={backUrl} alt="Foto do ambiente" className="h-full w-full object-cover" />
        )}
        {frontUrl && (
          <img
            src={frontUrl}
            alt={`Foto de ${name}`}
            className="absolute left-2 top-2 h-20 w-[3.75rem] rounded-lg border-2 border-card object-cover shadow"
          />
        )}
      </div>

      {/* tempo, categoria e contador de comentários */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-xs font-semibold text-chip-foreground">
          <Clock className="size-3.5" />
          {formatDuration(item.duration_minutes)} de estudo
        </span>
        <span className="text-xs text-muted-foreground">{tagLabel(item.tag)}</span>

        <button
          type="button"
          onClick={() => setCommentsOpen((o) => !o)}
          aria-label="Comentários"
          className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <MessageCircle className="size-[18px]" />
          {count}
        </button>
      </div>

      <p className="whitespace-pre-line break-words text-sm">{item.title}</p>

      <Comments
        logId={item.id}
        userId={userId}
        count={count}
        last={item.last_comment ?? null}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCountChange={setCount}
      />
    </article>
  )
}