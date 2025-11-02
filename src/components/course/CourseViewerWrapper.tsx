'use client'

import { useState } from 'react'
import CourseViewer from './CourseViewer'
import type { Vinprovningar, Module, ContentItem } from '@/payload-types'

interface CourseViewerWrapperProps {
  course: Vinprovningar
  initialModule?: Module
  initialLesson?: ContentItem
  userHasAccess?: boolean
}

export default function CourseViewerWrapper({
  course,
  initialModule,
  initialLesson,
  userHasAccess = false,
}: CourseViewerWrapperProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<number | undefined>(initialLesson?.id)

  const handleLessonChange = (moduleId: string, lessonId: string) => {
    setSelectedLessonId(parseInt(lessonId))
  }

  const handleProgressUpdate = (progress: any) => {
    // Handle progress updates
    console.log('Progress update:', progress)
  }

  // Transform the course data to match CourseViewer expectations
  const transformedCourse = {
    id: course.id,
    title: course.title || 'Untitled Course',
    description: course.description || 'No description available',
    modules: Array.isArray(course.modules)
      ? course.modules.map((module: any) => ({
          id: typeof module === 'object' ? module.id : module,
          title: typeof module === 'object' ? module.title || 'Untitled Module' : 'Untitled Module',
          description:
            typeof module === 'object' ? module.description || 'No description' : 'No description',
          order: typeof module === 'object' ? module.order || 0 : 0,
          lessons: [], // Will be populated by the kurser page
        }))
      : [],
  }

  return (
    <CourseViewer
      course={transformedCourse}
      onLessonChange={handleLessonChange}
      onProgressUpdate={handleProgressUpdate}
      selectedLessonId={selectedLessonId}
      userHasAccess={userHasAccess}
    />
  )
}
