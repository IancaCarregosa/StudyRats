import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import AuthPage from '@/pages/AuthPage'
import HomePage from '@/pages/HomePage'
import GroupsPage from '@/pages/GroupsPage'
import StudyPage from '@/pages/StudyPage'
import RankingPage from '@/pages/RankingPage'
import ProfilePage from '@/pages/ProfilePage'
import NotificationsPage from '@/pages/NotificationsPage'
import BottomNav, { type NavId } from '@/components/BottomNav'

type View = NavId | 'new' | 'notifications'

const TITLES: Partial<Record<View, string>> = {
  groups: 'Grupos',
  ranking: 'Ranking',
}

function Shell({ userId }: { userId: string }) {
  const [view, setView] = useState<View>('home')
  const [groupsFocus, setGroupsFocus] = useState<'create' | 'join' | undefined>()
  const [unread, setUnread] = useState(0)

  // contador de notificações não lidas (sino da home)
  const refreshUnread = useCallback(async () => {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
    setUnread(count ?? 0)
  }, [userId])

  useEffect(() => {
    refreshUnread()
    const timer = setInterval(refreshUnread, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshUnread])

  // guarda o fuso horário do navegador: semana, mês e sequência dependem dele
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) {
      supabase.from('profiles').update({ timezone: tz }).eq('id', userId).then(() => {})
    }
  }, [userId])

  function goGroups(focus?: 'create' | 'join') {
    setGroupsFocus(focus)
    setView('groups')
  }

  const activeNav: NavId = view === 'new' || view === 'notifications' ? 'home' : view
  const title = TITLES[view]

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-36">
      {view === 'home' && (
        <HomePage
          userId={userId}
          unread={unread}
          onOpenNotifications={() => setView('notifications')}
          onStart={() => setView('new')}
          onGoGroups={goGroups}
        />
      )}

      {view === 'notifications' && (
        <NotificationsPage
          userId={userId}
          onBack={() => setView('home')}
          onChanged={refreshUnread}
        />
      )}

      {view === 'new' && (
        <>
          <header className="flex items-center justify-between px-6 pt-6">
            <h1 className="text-2xl font-bold">Novo registro</h1>
            <button
              type="button"
              onClick={() => setView('home')}
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-full border bg-card"
            >
              <X className="size-5" />
            </button>
          </header>
          <StudyPage userId={userId} onPublished={() => setView('home')} />
        </>
      )}

      {title && <h1 className="px-4 pt-6 text-2xl font-bold">{title}</h1>}
      {view === 'groups' && <GroupsPage userId={userId} focus={groupsFocus} />}
      {view === 'ranking' && <RankingPage userId={userId} />}
      {view === 'profile' && <ProfilePage userId={userId} />}

      {view !== 'new' && (
        <BottomNav
          active={activeNav}
          onChange={(id) => setView(id)}
          onNew={() => setView('new')}
        />
      )}
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  return session ? <Shell userId={session.user.id} /> : <AuthPage />
}