// "agora", "há 5 min", "há 3 h", "há 2 d" ou a data completa depois de uma semana
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function formatDuration(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

// "Hoje, às 14:32" / "Ontem, às 10:15" / "18/11, às 10:15"
export function formatPostTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (d.toDateString() === now.toDateString()) return `Hoje, às ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Ontem, às ${time}`

  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${date}, às ${time}`
}

// "quarta, 18 de novembro" (o CSS deixa em maiúsculas)
export function formatDateHeader(date = new Date()) {
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0]
  const rest = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${weekday}, ${rest}`
}