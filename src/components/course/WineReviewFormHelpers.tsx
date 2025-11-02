import React from 'react'

/**
 * Helper components for WineReviewForm
 * Extracted to prevent re-mounting issues on parent re-renders
 */

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
    <div className="bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent border-b border-border px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
    </div>
    <div className="divide-y divide-border">{children}</div>
  </div>
)

export const InputRow = ({
  label,
  children,
  error,
  attemptSubmit,
}: {
  label: string
  children: React.ReactNode
  error?: string
  attemptSubmit?: boolean
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:px-5 md:py-4 even:bg-muted/20 transition-colors hover:bg-muted/30">
    <div className="flex items-start">
      <label className="text-sm font-medium text-foreground leading-6">{label}</label>
    </div>
    <div className="md:col-span-2">
      {children}
      {attemptSubmit && error ? (
        <p className="text-xs text-destructive font-medium mt-1.5 flex items-center gap-1" role="alert">
          <span>⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  </div>
)
