'use client'

export function SecretSlotPanel({ slot, wineLabel }: { slot: number; wineLabel: string }) {
  return (
    <div className="rounded-[20px] p-0.5 bg-gradient-to-r from-[#FB914C] to-[#FDBA75] shadow-[0_0_40px_-16px_rgba(251,145,76,0.35)]">
      <div className="rounded-[18px] bg-card p-7 text-center space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ditt hemliga nummer
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
          <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-1.5 inline-block">
            {wineLabel}
          </p>
        </div>

        <div className="text-left space-y-2.5 max-w-[28rem] mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Så gör du
          </p>
          <ol className="text-sm space-y-2 list-decimal list-inside marker:text-brand-400 marker:font-medium">
            <li>
              Skriv siffran <strong>{slot}</strong> på en lapp och tejpa fast på din inslagna
              flaska — gör det privat så ingen ser vilket nummer som hör till vilken flaska.
            </li>
            <li>
              Ställ flaskan på provningsbordet. Var den hamnar spelar ingen roll — det är numret
              som räknas.
            </li>
            <li>Tryck på &ldquo;Klart&rdquo; när din flaska är märkt och placerad.</li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          Visa inte denna skärm för andra deltagare.
        </p>
      </div>
    </div>
  )
}
