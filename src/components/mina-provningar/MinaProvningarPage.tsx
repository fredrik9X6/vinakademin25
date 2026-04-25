'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Wine } from 'lucide-react'
import Link from 'next/link'
import { transformEnrollmentData, type TransformedCourse } from '@/lib/course-enrollment-utils'
import { ProvningCard } from './ProvningCard'
import { PrepChecklist } from './PrepChecklist'

export function MinaProvningarPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<TransformedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [checklistDismissed, setChecklistDismissed] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/logga-in?from=/mina-provningar')
    }
  }, [authLoading, user, router])

  // Fetch courses
  useEffect(() => {
    if (!user?.id) return

    const fetchCourses = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/users/${user.id}/courses`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          const transformed = (data.data || []).map(transformEnrollmentData)
          setCourses(transformed)
        }
      } catch (error) {
        console.error('Error loading courses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [user?.id])

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const startedCourses = courses.filter(
    (c) => c.progress.percentage > 0 && !c.progress.completed,
  )
  const completedCourses = courses.filter((c) => c.progress.completed)
  const hasNewCourse = courses.some((c) => c.progress.percentage === 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mina Provningar</h1>
        <p className="mt-2 text-muted-foreground">
          Här hittar du dina köpta vinprovningar och kan följa dina framsteg.
        </p>
      </div>

      {/* Prep Checklist — visible when user has a course at 0% */}
      {hasNewCourse && !checklistDismissed && (
        <div className="mb-8">
          <PrepChecklist onDismiss={() => setChecklistDismissed(true)} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-6 mb-6">
            <Wine className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Inga provningar ännu</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Du har inte köpt några vinprovningar ännu. Utforska våra provningar och börja din vinresa!
          </p>
          <Link href="/vinprovningar" className="btn-brand">
            Utforska vinprovningar
          </Link>
        </div>
      ) : (
        /* Tabs with course grid */
        <Tabs defaultValue="alla" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="alla">
              Alla ({courses.length})
            </TabsTrigger>
            <TabsTrigger value="paborjade">
              Påbörjade ({startedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="slutforda">
              Slutförda ({completedCourses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alla">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <ProvningCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="paborjade">
            {startedCourses.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                Inga påbörjade provningar ännu.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {startedCourses.map((course) => (
                  <ProvningCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="slutforda">
            {completedCourses.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                Inga slutförda provningar ännu.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map((course) => (
                  <ProvningCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
