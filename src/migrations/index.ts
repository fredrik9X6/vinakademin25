import * as migration_20260423_210954 from './20260423_210954';
import * as migration_20260426_095502_add_subscribers_collection from './20260426_095502_add_subscribers_collection';
import * as migration_20260426_100149_add_events_collection from './20260426_100149_add_events_collection';
import * as migration_20260427_195730_fix_user_delete_constraints from './20260427_195730_fix_user_delete_constraints';

export const migrations = [
  {
    up: migration_20260423_210954.up,
    down: migration_20260423_210954.down,
    name: '20260423_210954',
  },
  {
    up: migration_20260426_095502_add_subscribers_collection.up,
    down: migration_20260426_095502_add_subscribers_collection.down,
    name: '20260426_095502_add_subscribers_collection',
  },
  {
    up: migration_20260426_100149_add_events_collection.up,
    down: migration_20260426_100149_add_events_collection.down,
    name: '20260426_100149_add_events_collection',
  },
  {
    up: migration_20260427_195730_fix_user_delete_constraints.up,
    down: migration_20260427_195730_fix_user_delete_constraints.down,
    name: '20260427_195730_fix_user_delete_constraints'
  },
];
