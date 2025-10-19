import * as migration_20251011_184346_rename_free_lesson_count from './20251011_184346_rename_free_lesson_count';

export const migrations = [
  {
    up: migration_20251011_184346_rename_free_lesson_count.up,
    down: migration_20251011_184346_rename_free_lesson_count.down,
    name: '20251011_184346_rename_free_lesson_count'
  },
];
