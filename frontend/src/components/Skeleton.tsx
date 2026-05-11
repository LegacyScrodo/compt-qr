interface Props {
  className?: string
}

export function Skeleton({ className = '' }: Props) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />
}
