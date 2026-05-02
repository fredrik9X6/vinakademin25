import type { QuadrantKey } from '@/lib/vinkompassen/types'

interface Props {
  active: QuadrantKey
  size?: number
  className?: string
}

const cells: Array<{ key: QuadrantKey; row: number; col: number; label: string }> = [
  { key: 'light-classic', row: 0, col: 0, label: 'Lätt + Klassisk' },
  { key: 'light-adventurous', row: 0, col: 1, label: 'Lätt + Äventyrlig' },
  { key: 'bold-classic', row: 1, col: 0, label: 'Fyllig + Klassisk' },
  { key: 'bold-adventurous', row: 1, col: 1, label: 'Fyllig + Äventyrlig' },
]

export function QuadrantMini({ active, size = 200, className = '' }: Props) {
  return (
    <div
      className={`grid grid-cols-2 grid-rows-2 gap-1 ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Vinkompassens fyrfält — du är ${cells.find((c) => c.key === active)?.label}`}
    >
      {cells.map((c) => {
        const isActive = c.key === active
        return (
          <div
            key={c.key}
            className={
              isActive
                ? 'rounded-md border border-[#FB914C] bg-[#FB914C]/15'
                : 'rounded-md border border-border bg-card/40'
            }
            aria-current={isActive ? 'true' : undefined}
          />
        )
      })}
    </div>
  )
}
