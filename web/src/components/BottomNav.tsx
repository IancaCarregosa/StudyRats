import { Home, Plus, Trophy, User, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavId = 'home' | 'groups' | 'ranking' | 'profile'

type Props = {
  active: NavId
  onChange: (id: NavId) => void
  onNew: () => void
}

const LEFT: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'groups', label: 'Grupos', icon: Users },
]
const RIGHT: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'profile', label: 'Perfil', icon: User },
]

function Item({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="flex flex-col items-center gap-1 py-1"
    >
      <span
        className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
          active ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span
        className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </button>
  )
}

export default function BottomNav({ active, onChange, onNew }: Props) {
  return (
    <nav
      className="fixed left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-[26rem] -translate-x-1/2 rounded-3xl border bg-card px-2 pb-1 pt-2 shadow-lg"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 items-end">
        {LEFT.map((i) => (
          <Item
            key={i.id}
            label={i.label}
            icon={i.icon}
            active={active === i.id}
            onClick={() => onChange(i.id)}
          />
        ))}

        <button
          type="button"
          onClick={onNew}
          aria-label="Novo registro"
          className="flex flex-col items-center gap-1 py-1"
        >
          <span className="-mt-9 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-background">
            <Plus className="size-7" />
          </span>
          <span className="text-[11px] font-medium">Novo</span>
        </button>

        {RIGHT.map((i) => (
          <Item
            key={i.id}
            label={i.label}
            icon={i.icon}
            active={active === i.id}
            onClick={() => onChange(i.id)}
          />
        ))}
      </div>
    </nav>
  )
}