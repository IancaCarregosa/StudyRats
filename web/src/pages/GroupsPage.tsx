import { useCallback, useEffect, useState } from 'react'
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

type Group = { id: string; name: string; code: string }

// ---------------------------------------------------------------
// Criar grupo
// ---------------------------------------------------------------
function CreateGroupCard({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.rpc('create_group', {
      p_name: name,
      p_password: password || null,
    })

    setLoading(false)
    if (error) return setError(error.message)

    setName('')
    setPassword('')
    onDone()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar grupo</CardTitle>
        <CardDescription>Você recebe um código para convidar os amigos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Nome do grupo</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-password">Senha (opcional)</Label>
            <Input
              id="group-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe vazio para grupo aberto"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar grupo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------
// Entrar em grupo (2 passos: buscar pelo código -> confirmar/senha)
// ---------------------------------------------------------------
function JoinGroupCard({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<{ name: string; requires_password: boolean } | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.rpc('get_group_preview', { p_code: code })

    setLoading(false)
    if (error) return setError(error.message)
    if (!data || data.length === 0) return setError('Grupo não encontrado.')
    setPreview(data[0])
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.rpc('join_group', {
      p_code: code,
      p_password: password || null,
    })

    setLoading(false)
    if (error) return setError(error.message)

    reset()
    onDone()
  }

  function reset() {
    setCode('')
    setPassword('')
    setPreview(null)
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar em um grupo</CardTitle>
        <CardDescription>Digite o código que um amigo te passou.</CardDescription>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="join-code">Código</Label>
              <Input
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="secondary" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar grupo'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <p className="text-sm">
              Grupo encontrado: <strong>{preview.name}</strong>
            </p>
            {preview.requires_password && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="join-password">Senha do grupo</Label>
                <Input
                  id="join-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
export default function GroupsPage({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('joined_at, group:groups(id, name, code)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = (data ?? []).map((row: any) => row.group).filter(Boolean) as Group[]
      setGroups(list)
      setError(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function leaveGroup(group: Group) {
    if (!window.confirm(`Sair do grupo "${group.name}"?`)) return

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', userId)

    if (error) return setError(error.message)
    load()
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // sem permissão de clipboard: o código continua visível na tela
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">Seus grupos ({groups.length}/5)</h2>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Você ainda não está em nenhum grupo. Crie um ou entre com um código.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  Código: <span className="font-mono">{g.code}</span>
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => copyCode(g.code)}>
                  {copied === g.code ? 'Copiado!' : 'Copiar código'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => leaveGroup(g)}>
                  Sair
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateGroupCard onDone={load} />
      <JoinGroupCard onDone={load} />
    </div>
  )
}