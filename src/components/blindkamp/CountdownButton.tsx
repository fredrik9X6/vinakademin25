'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CountdownButton({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState<number | null>(null)
  function start() {
    setCount(3)
    let n = 3
    const tick = () => {
      n -= 1
      if (n <= 0) {
        setCount(0)
        onComplete()
        setTimeout(() => setCount(null), 800)
      } else {
        setCount(n)
        setTimeout(tick, 1000)
      }
    }
    setTimeout(tick, 1000)
  }
  if (count !== null) {
    return (
      <div className="text-center py-6 text-5xl font-heading text-brand-400">
        {count === 0 ? 'NU' : count}
      </div>
    )
  }
  return (
    <Button onClick={start} className="w-full">
      Räkna ner (3, 2, 1)
    </Button>
  )
}
