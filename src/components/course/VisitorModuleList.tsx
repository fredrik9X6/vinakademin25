'use client'

import { Card, CardContent } from '../ui/card'
import { Lock } from 'lucide-react'

interface VisitorModuleListProps {
  modules: Array<{
    id: string | number
    title: string
    itemCount: number
  }>
}

export function VisitorModuleList({ modules }: VisitorModuleListProps) {
  if (modules.length === 0) return null

  return (
    <div className="my-8">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Så går kvällen till
      </h3>
      <div className="space-y-2">
        {modules.map((module, index) => (
          <Card key={module.id} className="border border-border/60 bg-card/60">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-300/15 text-sm font-semibold text-brand-400">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{module.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {module.itemCount} {module.itemCount === 1 ? 'del' : 'delar'}
                  </p>
                </div>
              </div>
              <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Innehållet låses upp när du köper vinkvällen.
      </p>
    </div>
  )
}
