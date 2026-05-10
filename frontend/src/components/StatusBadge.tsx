interface Props { statut: 'actif' | 'inactif' }

export function StatusBadge({ statut }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      statut === 'actif'
        ? 'bg-green-900/50 text-green-400'
        : 'bg-red-900/50 text-red-400'
    }`}>
      {statut}
    </span>
  )
}
