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

// "1h 30", "34h 20", "45 min" (formato dos cartões do perfil)
export function formatHM(total: number) {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${String(m).padStart(2, '0')}`
}

// "YYYY-MM-DD" -> Date local (sem deslocamento de fuso)
export function parseDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// "16 a 18 de novembro" / "30 de outubro a 2 de novembro" / "18 de novembro"
export function formatDateRange(start: Date, end: Date, pad = false) {
  const month = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' })
  const day = (d: Date) => (pad ? String(d.getDate()).padStart(2, '0') : String(d.getDate()))

  if (start.toDateString() === end.toDateString()) return `${day(end)} de ${month(end)}`
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${day(start)} a ${day(end)} de ${month(end)}`
  }
  return `${day(start)} de ${month(start)} a ${day(end)} de ${month(end)}`
}

// segunda-feira desta semana até hoje
export function currentWeekRange() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return formatDateRange(monday, today)
}