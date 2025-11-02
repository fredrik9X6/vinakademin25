import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPrice } from '@/lib/stripe'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Vinprovningar } from '@/payload-types'

interface PaymentStatusProps {
  status: 'processing' | 'success' | 'error'
  course: Vinprovningar
  error?: string | null
  onClose: () => void
  onRetry?: () => void
}

export function PaymentStatus({ status, course, error, onClose, onRetry }: PaymentStatusProps) {
  const router = useRouter()

  const handleGoToCourse = () => {
    onClose()
    router.push(`/vinprovningar/${course.slug}`)
  }

  const handleGoToCourses = () => {
    onClose()
    router.push('/vinprovningar')
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Behandlar betalning...</h3>
          <p className="text-muted-foreground">
            Vänligen vänta medan vi behandlar din betalning. Detta kan ta några sekunder.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Stäng inte det här fönstret förrän betalningen är klar.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-green-600">Köp genomfört!</h3>
          <p className="text-muted-foreground">
            Tack för ditt köp av <strong>{course.title}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Betalning: {formatPrice(course.price || 0)}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 w-full">
          <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">Vad händer nu?</h4>
          <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <li>✓ Du har nu tillgång till vinprovningen</li>
            <li>✓ Ett kvitto har skickats till din e-post</li>
            <li>✓ Du kan börja studera direkt</li>
          </ul>
        </div>

        <div className="flex gap-3 w-full">
          <Button onClick={handleGoToCourse} className="flex-1">
            Börja studera
          </Button>
          <Button onClick={handleGoToCourses} variant="outline" className="flex-1">
            Alla vinprovningar
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <XCircle className="w-16 h-16 text-red-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-red-600">Betalning misslyckades</h3>
          <p className="text-muted-foreground">
            Vi kunde inte genomföra betalningen för <strong>{course.title}</strong>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 w-full">
          <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Vanliga orsaker:</h4>
          <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>• Otillräckligt saldo på kortet</li>
            <li>• Kortet har spärrats av banken</li>
            <li>• Felaktiga kortuppgifter</li>
            <li>• Nätverksproblem</li>
          </ul>
        </div>

        <div className="flex gap-3 w-full">
          {onRetry && (
            <Button onClick={onRetry} className="flex-1">
              Försök igen
            </Button>
          )}
          <Button onClick={onClose} variant="outline" className="flex-1">
            Stäng
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Behöver du hjälp? Kontakta vår support på support@vinakademin.se
        </p>
      </div>
    )
  }

  return null
}
