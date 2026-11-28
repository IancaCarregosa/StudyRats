// Mascote do Study Rats. Exporte o vetor do Figma como PNG com fundo transparente
// e salve em web/public/mascot.png. Sem o arquivo, o componente simplesmente some.
export default function Mascot({ className = '' }: { className?: string }) {
  return (
    <img
      src="/mascot.png"
      alt=""
      aria-hidden="true"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}