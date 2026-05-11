interface Props {
  name: string
  logo?: string | null
  size?: number
  className?: string
}

function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 360
}

export function Avatar({ name, logo, size = 64, className = '' }: Props) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        style={{ width: size, height: size }}
        className={`rounded-xl object-contain border border-gray-100 bg-gray-50 p-1 flex-shrink-0 ${className}`}
      />
    )
  }
  const hue = hashHue(name)
  const bg = `hsl(${hue}, 65%, 45%)`
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
      className={`rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}
