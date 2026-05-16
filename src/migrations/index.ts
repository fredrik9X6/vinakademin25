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
import * as migration_20260510_074845_session_claim_email_tracking from './20260510_074845_session_claim_email_tracking';
import * as migration_20260510_131444_session_participants_current_lesson from './20260510_131444_session_participants_current_lesson';
import * as migration_20260512_101537_chunk_a_tasting_plans_foundation from './20260512_101537_chunk_a_tasting_plans_foundation';
import * as migration_20260513_071543_chunk_c_current_wine_pour_order from './20260513_071543_chunk_c_current_wine_pour_order';
import * as migration_20260513_074240_chunk_d_wrap_up_email from './20260513_074240_chunk_d_wrap_up_email';
import * as migration_20260513_090406_chunk_e_tasting_templates from './20260513_090406_chunk_e_tasting_templates';
import * as migration_20260513_121600_chunk_f_host_superpowers from './20260513_121600_chunk_f_host_superpowers';
import * as migration_20260513_132329_chunk_g_polish from './20260513_132329_chunk_g_polish';
import * as migration_20260513_152909_chunk_g_profile_public from './20260513_152909_chunk_g_profile_public';
import * as migration_20260514_144902_add_systembolaget_products_collection from './20260514_144902_add_systembolaget_products_collection';
import * as migration_20260514_161256_add_custom_wine_image_url from './20260514_161256_add_custom_wine_image_url';
import * as migration_20260515_115353_add_review_published_to_profile from './20260515_115353_add_review_published_to_profile';
import * as migration_20260516_103250_add_media_bottle_size from './20260516_103250_add_media_bottle_size';

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
    name: '20260509_134811_subscribers_lead_magnet_fields',
  },
  {
    up: migration_20260510_074845_session_claim_email_tracking.up,
    down: migration_20260510_074845_session_claim_email_tracking.down,
    name: '20260510_074845_session_claim_email_tracking',
  },
  {
    up: migration_20260510_131444_session_participants_current_lesson.up,
    down: migration_20260510_131444_session_participants_current_lesson.down,
    name: '20260510_131444_session_participants_current_lesson',
  },
  {
    up: migration_20260512_101537_chunk_a_tasting_plans_foundation.up,
    down: migration_20260512_101537_chunk_a_tasting_plans_foundation.down,
    name: '20260512_101537_chunk_a_tasting_plans_foundation',
  },
  {
    up: migration_20260513_071543_chunk_c_current_wine_pour_order.up,
    down: migration_20260513_071543_chunk_c_current_wine_pour_order.down,
    name: '20260513_071543_chunk_c_current_wine_pour_order',
  },
  {
    up: migration_20260513_074240_chunk_d_wrap_up_email.up,
    down: migration_20260513_074240_chunk_d_wrap_up_email.down,
    name: '20260513_074240_chunk_d_wrap_up_email',
  },
  {
    up: migration_20260513_090406_chunk_e_tasting_templates.up,
    down: migration_20260513_090406_chunk_e_tasting_templates.down,
    name: '20260513_090406_chunk_e_tasting_templates',
  },
  {
    up: migration_20260513_121600_chunk_f_host_superpowers.up,
    down: migration_20260513_121600_chunk_f_host_superpowers.down,
    name: '20260513_121600_chunk_f_host_superpowers',
  },
  {
    up: migration_20260513_132329_chunk_g_polish.up,
    down: migration_20260513_132329_chunk_g_polish.down,
    name: '20260513_132329_chunk_g_polish',
  },
  {
    up: migration_20260513_152909_chunk_g_profile_public.up,
    down: migration_20260513_152909_chunk_g_profile_public.down,
    name: '20260513_152909_chunk_g_profile_public',
  },
  {
    up: migration_20260514_144902_add_systembolaget_products_collection.up,
    down: migration_20260514_144902_add_systembolaget_products_collection.down,
    name: '20260514_144902_add_systembolaget_products_collection',
  },
  {
    up: migration_20260514_161256_add_custom_wine_image_url.up,
    down: migration_20260514_161256_add_custom_wine_image_url.down,
    name: '20260514_161256_add_custom_wine_image_url',
  },
  {
    up: migration_20260515_115353_add_review_published_to_profile.up,
    down: migration_20260515_115353_add_review_published_to_profile.down,
    name: '20260515_115353_add_review_published_to_profile',
  },
  {
    up: migration_20260516_103250_add_media_bottle_size.up,
    down: migration_20260516_103250_add_media_bottle_size.down,
    name: '20260516_103250_add_media_bottle_size'
  },
];
