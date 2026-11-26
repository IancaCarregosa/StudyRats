import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Mode = 'login' | 'signup'

function traduzErro(message: string) {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('User already registered')) return 'Esse e-mail já está cadastrado.'
  if (message.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (message.includes('Unable to validate email')) return 'E-mail inválido.'
  return message
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      })
      if (error) setError(traduzErro(error.message))
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traduzErro(error.message))
    }

    setLoading(false)
    // se deu certo, o useSession detecta a sessão e o App troca de tela sozinho
  }

  const isSignup = mode === 'signup'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Study Rats</CardTitle>
          <CardDescription>
            {isSignup ? 'Crie sua conta para começar' : 'Entre para continuar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignup && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como os amigos vão te ver"
                  required
                  minLength={2}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Aguarde...' : isSignup ? 'Criar conta' : 'Entrar'}
            </Button>

            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup')
                setError(null)
              }}
            >
              {isSignup ? 'Já tenho conta' : 'Criar uma conta'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}