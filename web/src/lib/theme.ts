export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'studyrats-theme'

export function getStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function applyMode(mode: ThemeMode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setMode(mode: ThemeMode) {
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // sem localStorage: o tema vale só até recarregar
  }
  applyMode(mode)
}

export function initTheme() {
  applyMode(getStoredMode())
  // no modo "Sistema", acompanha a troca do celular/computador em tempo real
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredMode() === 'system') applyMode('system')
  })
}