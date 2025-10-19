import React from 'react'

/**
 * Helper components for WineReviewForm
 * Extracted to prevent re-mounting issues on parent re-renders
 */

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-md border">
    <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
      {title}
    </div>
    <div className="divide-y">{children}</div>
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
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40">
    <div className="text-sm font-medium text-muted-foreground">{label}</div>
    <div className="md:col-span-2">
      {children}
      {attemptSubmit && error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
    </div>
  </div>
)
