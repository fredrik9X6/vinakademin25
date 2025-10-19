import type { Payload } from 'payload'

export async function up({ payload }: { payload: Payload }) {
  payload.logger.info('Migration 20251011_184346_rename_free_lesson_count up: no-op placeholder')
}

export async function down({ payload }: { payload: Payload }) {
  payload.logger.info('Migration 20251011_184346_rename_free_lesson_count down: no-op placeholder')
}
