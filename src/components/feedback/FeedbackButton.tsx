'use client'

import { useState } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { trackEvent } from '@/components/analytics'
import { toast } from 'sonner'

type FeedbackType = 'bug' | 'idea' | 'other'

interface FeedbackButtonProps {
  /** Position of the button */
  position?: 'bottom-right' | 'bottom-left'
}

export function FeedbackButton({ position = 'bottom-right' }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('idea')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Skriv ett meddelande först')
      return
    }

    setIsSubmitting(true)

    try {
      // Track feedback in PostHog
      trackEvent('feedback_submitted', {
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: window.location.href,
        page_path: window.location.pathname,
      })

      toast.success('Tack för din feedback! 🙏')
      setMessage('')
      setFeedbackType('idea')
      setIsOpen(false)
    } catch (error) {
      toast.error('Något gick fel. Försök igen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-shadow h-12 w-12 p-0"
            aria-label="Ge feedback"
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4"
          side="top"
          align={position === 'bottom-right' ? 'end' : 'start'}
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Ge oss feedback</h3>
              <p className="text-sm text-muted-foreground">
                Hjälp oss förbättra Vinakademin
              </p>
            </div>

            <div className="space-y-2">
              <Label>Typ av feedback</Label>
              <RadioGroup
                value={feedbackType}
                onValueChange={(value) => setFeedbackType(value as FeedbackType)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bug" id="bug" />
                  <Label htmlFor="bug" className="font-normal cursor-pointer">
                    🐛 Bugg
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="idea" id="idea" />
                  <Label htmlFor="idea" className="font-normal cursor-pointer">
                    💡 Idé
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    💬 Annat
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Meddelande</Label>
              <Textarea
                id="feedback-message"
                placeholder="Berätta vad du tänker..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                'Skickar...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Skicka feedback
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

