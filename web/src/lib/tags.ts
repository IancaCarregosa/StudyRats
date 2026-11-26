// Os valores precisam ser iguais aos do CHECK da tabela study_logs
export const TAGS = [
  { value: 'idiomas', label: 'Idiomas' },
  { value: 'projeto', label: 'Projeto' },
  { value: 'aula-teorica', label: 'Aula teórica' },
  { value: 'leitura', label: 'Leitura' },
  { value: 'exercicios', label: 'Exercícios' },
  { value: 'outro', label: 'Outro' },
] as const

export function tagLabel(value: string) {
  return TAGS.find((t) => t.value === value)?.label ?? value
}