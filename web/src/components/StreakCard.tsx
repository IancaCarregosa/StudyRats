import { Check, Flame } from 'lucide-react'

export type WeekDay = { day: string; done: boolean; is_today: boolean }

// segunda a domingo
const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export default function StreakCard({
  streak,
  best,
  week,
}: {
  streak: number
  best: number
  week: WeekDay[]
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`size-5 ${streak > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="font-semibold">
            {streak === 0
              ? 'Comece sua sequência hoje'
              : `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}`}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Recorde: {best} {best === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {LETTERS.map((letter, i) => {
          const d = week[i]
          const number = d ? parseInt(d.day.slice(8, 10), 10) : ''

          let circle = 'border text-muted-foreground'
          if (d?.done) circle = 'bg-primary text-primary-foreground'
          else if (d?.is_today) circle = 'border border-primary text-primary'

          const ring = d?.is_today ? 'ring-2 ring-brand ring-offset-2 ring-offset-card' : ''

          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={`flex size-9 items-center justify-center rounded-full text-xs font-medium ${circle} ${ring}`}
              >
                {d?.done ? <Check className="size-4" strokeWidth={3} /> : number}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  d?.is_today ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {letter}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}