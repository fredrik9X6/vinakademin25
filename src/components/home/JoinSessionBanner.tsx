'use client'

import { useState, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShineBorder } from '@/components/ui/shine-border'
import { ArrowRight, X } from 'lucide-react'

export const JoinSessionBanner = forwardRef<HTMLDivElement>((props, ref) => {
  const [code, setCode] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const router = useRouter()

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/delta?code=${encodeURIComponent(code.trim())}`)
    }
  }

  if (!isVisible) return null

  return (
    <div ref={ref} className="w-full py-4 flex justify-center opacity-0">
      <ShineBorder
        borderRadius={12}
        borderWidth={2}
        duration={14}
        color={['#FDBA75', '#FB914C', '#FDBA75']}
        className="bg-card p-0 min-h-0 min-w-0 w-auto relative border border-border"
      >
        <div className="px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 relative z-10">
          <form
            onSubmit={handleJoin}
            className="flex flex-col md:flex-row items-center gap-2 md:gap-3"
          >
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Skriv in kod för att gå med i en live vinprovning
            </span>
            <div className="flex gap-2">
              <Input
                id="session-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-28 text-center uppercase font-mono text-sm h-9 text-foreground dark:text-white"
                maxLength={6}
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={!code.trim()}
                className="h-9"
              >
                Gå med
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </form>
          <button
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </ShineBorder>
    </div>
  )
})

JoinSessionBanner.displayName = 'JoinSessionBanner'
