import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { Button } from '@/components/ui/button'
import Avatar from '@/components/Avatar'
import AuthPage from '@/pages/AuthPage'
import FeedPage from '@/pages/FeedPage'
import StudyPage from '@/pages/StudyPage'
import RankingPage from '@/pages/RankingPage'
import GroupsPage from '@/pages/GroupsPage'
import ProfilePage from '@/pages/ProfilePage'

type Tab = 'feed' | 'study' | 'ranking' | 'groups' | 'profile'

const TABS: { id: Tab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'study', label: 'Estudar' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'groups', label: 'Grupos' },
  { id: 'profile', label: 'Perfil' },
]

// Layout provisório: cabeçalho + abas. Será refeito quando o design do Figma chegar.
function Home({ userId }: { userId: string }) {
  const [name, setName] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        setName(data?.display_name ?? null)
        setAvatar(data?.avatar_url ?? null)
      })

    // guarda o fuso horário do navegador: semana, mês e sequência dependem dele
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) {
      supabase.from('profiles').update({ timezone: tz }).eq('id', userId).then(() => {})
    }
  }, [userId])

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-bold">Study Rats</span>
        <div className="flex items-center gap-3">
          <Avatar path={avatar} name={name ?? '?'} size={28} />
          <span className="text-sm text-muted-foreground">{name}</span>
          <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b p-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'default' : 'ghost'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>

      {tab === 'feed' && <FeedPage userId={userId} />}
      {tab === 'study' && <StudyPage userId={userId} onPublished={() => setTab('feed')} />}
      {tab === 'ranking' && <RankingPage userId={userId} />}
      {tab === 'groups' && <GroupsPage userId={userId} />}
      {tab === 'profile' && <ProfilePage userId={userId} onNameChange={setName} onAvatarChange={setAvatar} />}
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  return session ? <Home userId={session.user.id} /> : <AuthPage />
}