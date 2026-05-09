import * as migration_20260423_210954 from './20260423_210954';
import * as migration_20260426_095502_add_subscribers_collection from './20260426_095502_add_subscribers_collection';
import * as migration_20260426_100149_add_events_collection from './20260426_100149_add_events_collection';
import * as migration_20260427_195730_fix_user_delete_constraints from './20260427_195730_fix_user_delete_constraints';
import * as migration_20260427_201145_add_review_author_snapshots from './20260427_201145_add_review_author_snapshots';
import * as migration_20260502_102458_add_vinkompassen_to_subscribers_source from './20260502_102458_add_vinkompassen_to_subscribers_source';
import * as migration_20260502_103451_add_vinkompassen_collections from './20260502_103451_add_vinkompassen_collections';
import * as migration_20260502_112427_fix_vinkompass_attempts_archetype_constraint from './20260502_112427_fix_vinkompass_attempts_archetype_constraint';
import * as migration_20260503_103620_add_wine_type_field from './20260503_103620_add_wine_type_field';
import * as migration_20260503_144558_add_session_participants_email from './20260503_144558_add_session_participants_email';
import * as migration_20260509_134811_subscribers_lead_magnet_fields from './20260509_134811_subscribers_lead_magnet_fields';

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
    name: '20260427_195730_fix_user_delete_constraints',
  },
  {
    up: migration_20260427_201145_add_review_author_snapshots.up,
    down: migration_20260427_201145_add_review_author_snapshots.down,
    name: '20260427_201145_add_review_author_snapshots',
  },
  {
    up: migration_20260502_102458_add_vinkompassen_to_subscribers_source.up,
    down: migration_20260502_102458_add_vinkompassen_to_subscribers_source.down,
    name: '20260502_102458_add_vinkompassen_to_subscribers_source',
  },
  {
    up: migration_20260502_103451_add_vinkompassen_collections.up,
    down: migration_20260502_103451_add_vinkompassen_collections.down,
    name: '20260502_103451_add_vinkompassen_collections',
  },
  {
    up: migration_20260502_112427_fix_vinkompass_attempts_archetype_constraint.up,
    down: migration_20260502_112427_fix_vinkompass_attempts_archetype_constraint.down,
    name: '20260502_112427_fix_vinkompass_attempts_archetype_constraint',
  },
  {
    up: migration_20260503_103620_add_wine_type_field.up,
    down: migration_20260503_103620_add_wine_type_field.down,
    name: '20260503_103620_add_wine_type_field',
  },
  {
    up: migration_20260503_144558_add_session_participants_email.up,
    down: migration_20260503_144558_add_session_participants_email.down,
    name: '20260503_144558_add_session_participants_email',
  },
  {
    up: migration_20260509_134811_subscribers_lead_magnet_fields.up,
    down: migration_20260509_134811_subscribers_lead_magnet_fields.down,
    name: '20260509_134811_subscribers_lead_magnet_fields'
  },
];
