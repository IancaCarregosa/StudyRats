export default function Mascot({ className = '' }: { className?: string }) {
  return (
    <img
      src="/mascot.png"
      alt="Stuart - mascote do Study Rats"
      aria-hidden="true"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}