import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { Button } from '@/components/ui/button'
import AuthPage from '@/pages/AuthPage'
import GroupsPage from '@/pages/GroupsPage'
import StudyPage from '@/pages/StudyPage'
import FeedPage from '@/pages/FeedPage'

type Tab = 'feed' | 'study' | 'groups'

// Layout provisório: cabeçalho + abas. Será refeito quando o design do Figma chegar.
function Home({ userId }: { userId: string }) {
  const [name, setName] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        setName(data?.display_name ?? null)
      })
  }, [userId])

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-bold">Study Rats</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{name}</span>
          <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </header>

      <nav className="flex gap-2 border-b p-2">
        <Button size="sm" variant={tab === 'feed' ? 'default' : 'ghost'} onClick={() => setTab('feed')}>
          Feed
        </Button>
        <Button size="sm" variant={tab === 'study' ? 'default' : 'ghost'} onClick={() => setTab('study')}>
          Estudar
        </Button>
        <Button size="sm" variant={tab === 'groups' ? 'default' : 'ghost'} onClick={() => setTab('groups')}>
          Grupos
        </Button>
      </nav>

      {tab === 'feed' && <FeedPage userId={userId} />}
      {tab === 'study' && <StudyPage userId={userId} onPublished={() => setTab('feed')} />}
      {tab === 'groups' && <GroupsPage userId={userId} />}
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