import { ChevronDown } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateRange, formatDuration, formatHM, parseDay } from '@/lib/time'

export type Daily = { day: string; minutes: number }

const PERIODS = [7, 14, 30]

export default function RhythmChart({
  data,
  days,
  onDaysChange,
}: {
  data: Daily[]
  days: number
  onDaysChange: (days: number) => void
}) {
  const total = data.reduce((sum, d) => sum + d.minutes, 0)
  const active = data.filter((d) => d.minutes > 0).length
  const max = data.reduce((m, d) => Math.max(m, d.minutes), 0)

  // escala do eixo: 0, 30, 60 (cresce em degraus maiores se precisar)
  const step = max <= 60 ? 30 : max <= 180 ? 60 : 120
  const top = Math.max(60, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)

  const chartData = data.map((d, i) => ({
    label: d.day.slice(8, 10),
    minutes: d.minutes,
    today: i === data.length - 1,
  }))

  const range =
    data.length > 0
      ? formatDateRange(parseDay(data[0].day), parseDay(data[data.length - 1].day), true)
      : ''

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Ritmo de estudos</h2>
        <div className="relative">
          <select
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            aria-label="Período do gráfico"
            className="h-8 appearance-none rounded-full border bg-secondary pl-3 pr-7 text-xs font-semibold"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p} dias
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2" />
        </div>
      </div>

      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{total > 0 ? formatHM(total) : '0 min'}</span>
        <span className="text-sm text-muted-foreground">nos últimos {days} dias</span>
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{range}</span>
        <span className="font-semibold text-primary">
          {active} {active === 1 ? 'dia ativo' : 'dias ativos'}
        </span>
      </div>

      <div className="relative h-48 w-full">
        <span className="absolute left-0 top-0 text-[10px] text-muted-foreground">min</span>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 0, bottom: 0, left: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <YAxis
              ticks={ticks}
              domain={[0, top]}
              width={26}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={days > 14 ? 'preserveStartEnd' : 0}
              tick={(p) => (
                <text
                  x={Number(p.x)}
                  y={Number(p.y) + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={p.index === chartData.length - 1 ? 700 : 400}
                  fill={
                    p.index === chartData.length - 1 ? 'var(--foreground)' : 'var(--muted-foreground)'
                  }
                >
                  {p.payload.value}
                </text>
              )}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(l) => `Dia ${l}`}
              formatter={(v) => [formatDuration(Number(v)), 'Estudo']}
            />
            <Bar dataKey="minutes" radius={[6, 6, 0, 0]} minPointSize={3}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.today ? 'var(--brand)' : d.minutes === 0 ? 'var(--border)' : 'var(--primary)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          Minutos por dia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand" />
          Hoje
        </span>
      </div>
    </section>
  )
}