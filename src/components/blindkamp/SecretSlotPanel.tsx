'use client'

export function SecretSlotPanel({ slot, wineLabel }: { slot: number; wineLabel: string }) {
  return (
    <div className="rounded-[20px] p-0.5 bg-gradient-to-r from-[#FB914C] to-[#FDBA75] shadow-[0_0_40px_-16px_rgba(251,145,76,0.35)]">
      <div className="rounded-[18px] bg-card p-7 text-center space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Din hemliga plats
        </p>
        <p
          className="font-heading text-7xl leading-none tracking-[-0.015em]"
          style={{
            background: 'linear-gradient(90deg, #FB914C, #FDBA75)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          #{slot}
        </p>
        <p className="text-sm">
          Ställ din inslagna flaska på plats <strong>#{slot}</strong> när värden räknar ner.
        </p>
        <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2 inline-block">
          {wineLabel}
        </p>
        <p className="text-xs text-muted-foreground">Visa inte denna skärm för andra deltagare.</p>
      </div>
    </div>
  )
}
