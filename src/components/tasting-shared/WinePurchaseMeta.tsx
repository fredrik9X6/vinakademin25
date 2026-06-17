import * as React from 'react'

export interface WinePurchaseMetaProps {
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
  className?: string
}

/**
 * Meta line under a wine name: "145 kr · Systembolaget 795901", where the
 * article number links to the wine's systembolaget.se page. Renders nothing
 * when there's neither a price nor an article number.
 */
export function WinePurchaseMeta({
  priceSek,
  articleNumber,
  systembolagetUrl,
  className,
}: WinePurchaseMetaProps) {
  if (priceSek == null && !articleNumber) return null
  return (
    <p className={`mt-1 text-xs text-muted-foreground ${className ?? ''}`}>
      {priceSek != null && (
        <span className="tabular-nums">{priceSek.toLocaleString('sv-SE')} kr</span>
      )}
      {priceSek != null && articleNumber && <span aria-hidden="true"> · </span>}
      {articleNumber &&
        (systembolagetUrl ? (
          <a
            href={systembolagetUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Systembolaget {articleNumber}
          </a>
        ) : (
          <span>Systembolaget {articleNumber}</span>
        ))}
    </p>
  )
}
