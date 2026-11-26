import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { Button } from '@/components/ui/button'
import AuthPage from '@/pages/AuthPage'

// Tela temporária só para provar que login + banco + RLS funcionam.
// Depois vira a Home com o feed.
function TempHome({ userId }: { userId: string }) {
  const [name, setName] = useState<string | null>(null)

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">
        {name ? `Olá, ${name}!` : 'Carregando perfil...'}
      </h1>
      <p className="text-sm text-muted-foreground">Login e banco funcionando.</p>
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Sair
      </Button>
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  return session ? <TempHome userId={session.user.id} /> : <AuthPage />
}