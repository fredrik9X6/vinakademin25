import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Vinprovningar, Module, ContentItem, User } from '@/payload-types'

interface VersionInfo {
  version: string
  publishedAt: string
  author: string
  changes: string[]
  migrationPath?: string
}

interface ContentUpdate {
  id: string
  type: 'course' | 'module' | 'lesson'
  title: string
  changes: string[]
  version: string
  publishedAt: string
  affectedUsers?: string[]
}

export class ContentVersionManager {
  private payload: any

  constructor() {
    this.initializePayload()
  }

  private async initializePayload() {
    this.payload = await getPayload({ config })
  }

  /**
   * Create a new version of course content
   */
  async createVersion(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    changes: string[],
    author: string,
  ): Promise<VersionInfo> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get current published version
      const currentVersion = await this.payload.findByID({
        collection,
        id,
        draft: false,
      })

      if (!currentVersion) {
        throw new Error(`Published ${collection} with ID ${id} not found`)
      }

      // Generate new version number
      const newVersion = this.generateVersionNumber(currentVersion.version || '1.0.0')

      // Create draft version with changes
      const draftVersion = await this.payload.update({
        collection,
        id,
        data: {
          version: newVersion,
          versionHistory: [
            ...(currentVersion.versionHistory || []),
            {
              version: newVersion,
              publishedAt: new Date().toISOString(),
              author,
              changes,
            },
          ],
        },
        draft: true,
      })

      return {
        version: newVersion,
        publishedAt: new Date().toISOString(),
        author,
        changes,
      }
    } catch (error) {
      console.error('Error creating version:', error)
      throw error
    }
  }

  /**
   * Publish a draft version
   */
  async publishVersion(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    notifyUsers: boolean = true,
  ): Promise<any> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get draft version
      const draftVersion = await this.payload.findByID({
        collection,
        id,
        draft: true,
      })

      if (!draftVersion) {
        throw new Error(`Draft ${collection} with ID ${id} not found`)
      }

      // Publish the version
      const publishedVersion = await this.payload.update({
        collection,
        id,
        data: {
          ...draftVersion,
          publishedAt: new Date().toISOString(),
        },
        draft: false,
      })

      // Notify affected users if requested
      if (notifyUsers) {
        await this.notifyUsersOfUpdate(collection, id, draftVersion)
      }

      return publishedVersion
    } catch (error) {
      console.error('Error publishing version:', error)
      throw error
    }
  }

  /**
   * Get version history for content
   */
  async getVersionHistory(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
  ): Promise<VersionInfo[]> {
    if (!this.payload) await this.initializePayload()

    try {
      const content = await this.payload.findByID({
        collection,
        id,
        draft: false,
      })

      return content?.versionHistory || []
    } catch (error) {
      console.error('Error fetching version history:', error)
      throw error
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    targetVersion: string,
  ): Promise<any> {
    if (!this.payload) await this.initializePayload()

    try {
      const versionHistory = await this.getVersionHistory(collection, id)
      const targetVersionInfo = versionHistory.find((v) => v.version === targetVersion)

      if (!targetVersionInfo) {
        throw new Error(`Version ${targetVersion} not found`)
      }

      // Create a new version as rollback
      const newVersion = this.generateVersionNumber(versionHistory[0]?.version || '1.0.0')

      const rolledBackContent = await this.payload.update({
        collection,
        id,
        data: {
          version: newVersion,
          versionHistory: [
            ...versionHistory,
            {
              version: newVersion,
              publishedAt: new Date().toISOString(),
              author: 'system',
              changes: [`Rolled back to version ${targetVersion}`],
            },
          ],
        },
        draft: false,
      })

      return rolledBackContent
    } catch (error) {
      console.error('Error rolling back version:', error)
      throw error
    }
  }

  /**
   * Schedule content for future release
   */
  async scheduleRelease(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    releaseDate: Date,
  ): Promise<void> {
    if (!this.payload) await this.initializePayload()

    try {
      await this.payload.update({
        collection,
        id,
        data: {
          scheduledReleaseDate: releaseDate.toISOString(),
          _status: 'draft',
        },
        draft: true,
      })

      // Note: In a production system, you would set up a job scheduler
      // to automatically publish content at the scheduled time
      console.log(`Content scheduled for release at ${releaseDate.toISOString()}`)
    } catch (error) {
      console.error('Error scheduling release:', error)
      throw error
    }
  }

  /**
   * Retire old course content
   */
  async retireContent(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    migrationPath?: string,
  ): Promise<void> {
    if (!this.payload) await this.initializePayload()

    try {
      await this.payload.update({
        collection,
        id,
        data: {
          _status: 'archived',
          retiredAt: new Date().toISOString(),
          migrationPath,
        },
        draft: false,
      })

      // Notify enrolled users about retirement
      if (collection === 'vinprovningar') {
        await this.notifyUsersOfRetirement(id, migrationPath)
      }
    } catch (error) {
      console.error('Error retiring content:', error)
      throw error
    }
  }

  /**
   * Get content updates for users
   */
  async getContentUpdates(userId: string): Promise<ContentUpdate[]> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get user's enrolled courses
      const enrollments = await this.payload.find({
        collection: 'enrollments',
        where: {
          user: { equals: userId },
          status: { equals: 'active' },
        },
        depth: 2,
      })

      const updates: ContentUpdate[] = []

      for (const enrollment of enrollments.docs) {
        const course = enrollment.course

        // Check for course updates
        if (course.versionHistory?.length > 0) {
          const latestVersion = course.versionHistory[0]
          const userLastAccessed = enrollment.lastAccessedAt || enrollment.enrolledAt

          if (new Date(latestVersion.publishedAt) > new Date(userLastAccessed)) {
            updates.push({
              id: course.id,
              type: 'course',
              title: course.title,
              changes: latestVersion.changes,
              version: latestVersion.version,
              publishedAt: latestVersion.publishedAt,
            })
          }
        }
      }

      return updates
    } catch (error) {
      console.error('Error fetching content updates:', error)
      throw error
    }
  }

  /**
   * Generate next version number
   */
  private generateVersionNumber(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number)
    parts[2] = (parts[2] || 0) + 1 // Increment patch version
    return parts.join('.')
  }

  /**
   * Notify users of content updates
   */
  private async notifyUsersOfUpdate(
    collection: 'vinprovningar' | 'modules' | 'content-items',
    id: string,
    content: any,
  ): Promise<void> {
    if (!this.payload) await this.initializePayload()

    try {
      if (collection === 'vinprovningar') {
        // Find all enrolled users
        const enrollments = await this.payload.find({
          collection: 'enrollments',
          where: {
            course: { equals: id },
            status: { equals: 'active' },
          },
          depth: 1,
        })

        // Create notifications for each enrolled user
        for (const enrollment of enrollments.docs) {
          // In a real system, you would send email notifications or push notifications
          console.log(`Notifying user ${enrollment.user} of course update: ${content.title}`)
        }
      }
    } catch (error) {
      console.error('Error notifying users of update:', error)
    }
  }

  /**
   * Notify users of content retirement
   */
  private async notifyUsersOfRetirement(courseId: string, migrationPath?: string): Promise<void> {
    if (!this.payload) await this.initializePayload()

    try {
      const enrollments = await this.payload.find({
        collection: 'enrollments',
        where: {
          course: { equals: courseId },
          status: { equals: 'active' },
        },
        depth: 1,
      })

      for (const enrollment of enrollments.docs) {
        // In a real system, send retirement notification
        console.log(
          `Notifying user ${enrollment.user} of course retirement${migrationPath ? ` - Migration path: ${migrationPath}` : ''}`,
        )
      }
    } catch (error) {
      console.error('Error notifying users of retirement:', error)
    }
  }
}

export const contentVersionManager = new ContentVersionManager()
