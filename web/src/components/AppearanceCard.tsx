import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getStoredMode, setMode, type ThemeMode } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

export default function AppearanceCard() {
  const [mode, setLocalMode] = useState<ThemeMode>(getStoredMode())

  function choose(m: ThemeMode) {
    setMode(m)
    setLocalMode(m)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aparência</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          {OPTIONS.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={mode === o.value ? 'default' : 'outline'}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>

        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Sair da conta
        </Button>
      </CardContent>
    </Card>
  )
}