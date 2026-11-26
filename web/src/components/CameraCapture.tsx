import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  facing: 'user' | 'environment'
  label: string
  onCapture: (blob: Blob) => void
}

const MAX_SIZE = 1280 // lado maior da imagem final, em pixels

// Abre UMA câmera por vez (no iOS não dá para abrir duas ao mesmo tempo).
// O componente que usa este decide a ordem: frente -> verso.
export default function CameraCapture({ facing, label, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    setReady(false)
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Câmera indisponível. O navegador exige HTTPS (ou localhost).')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
        setReady(true)
      })
      .catch(() => {
        setError('Não foi possível acessar a câmera. Verifique a permissão do navegador.')
      })

    // desliga a câmera ao trocar de câmera ou sair da tela
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const scale = Math.min(1, MAX_SIZE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

    // JPEG funciona em todos os navegadores (WebP não é garantido no Safari)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      'image/jpeg',
      0.8
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{label}</p>

      {error ? (
        <p className="rounded-lg border p-4 text-sm text-red-500">{error}</p>
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`aspect-[3/4] w-full rounded-lg bg-black object-cover ${
            facing === 'user' ? '-scale-x-100' : ''
          }`}
        />
      )}

      <Button onClick={capture} disabled={!ready || !!error}>
        Capturar foto
      </Button>
    </div>
  )
}