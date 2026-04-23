import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_wine_preferences_preferred_styles" AS ENUM('light_red', 'medium_red', 'full_red', 'light_white', 'full_white', 'sparkling', 'rose', 'sweet', 'fortified', 'natural');
  CREATE TYPE "public"."enum_users_wine_preferences_discovery_preferences" AS ENUM('new_grapes', 'new_regions', 'price_ranges', 'wine_culture', 'recommendations', 'virtual_tastings');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'instructor', 'subscriber', 'user');
  CREATE TYPE "public"."enum_users_account_status" AS ENUM('active', 'suspended', 'deactivated');
  CREATE TYPE "public"."enum_users_subscription_status" AS ENUM('none', 'free_trial', 'active', 'past_due', 'canceled');
  CREATE TYPE "public"."enum_users_subscription_plan" AS ENUM('none', 'monthly', 'annual');
  CREATE TYPE "public"."enum_users_onboarding_goal" AS ENUM('learn_basics', 'pairing_confident', 'explore_regions', 'deep_knowledge');
  CREATE TYPE "public"."enum_users_onboarding_source" AS ENUM('registration', 'guest_checkout');
  CREATE TYPE "public"."enum_users_wine_preferences_tasting_experience" AS ENUM('Nybörjare', 'Medel', 'Avancerad', 'Expert');
  CREATE TYPE "public"."enum_users_wine_preferences_price_range" AS ENUM('budget', 'mid', 'premium', 'luxury');
  CREATE TYPE "public"."enum_vinprovningar_preview_video_provider" AS ENUM('none', 'mux');
  CREATE TYPE "public"."enum_vinprovningar_preview_mux_data_status" AS ENUM('preparing', 'ready', 'errored');
  CREATE TYPE "public"."enum_vinprovningar_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_vinprovningar_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__vinprovningar_v_version_preview_video_provider" AS ENUM('none', 'mux');
  CREATE TYPE "public"."enum__vinprovningar_v_version_preview_mux_data_status" AS ENUM('preparing', 'ready', 'errored');
  CREATE TYPE "public"."enum__vinprovningar_v_version_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum__vinprovningar_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_content_items_content_type" AS ENUM('lesson', 'quiz');
  CREATE TYPE "public"."enum_content_items_video_provider" AS ENUM('none', 'mux', 'youtube', 'vimeo');
  CREATE TYPE "public"."enum_content_items_mux_data_status" AS ENUM('preparing', 'ready', 'errored');
  CREATE TYPE "public"."enum_content_items_lesson_type" AS ENUM('video', 'text', 'mixed', 'wineReview');
  CREATE TYPE "public"."enum_content_items_quiz_settings_show_correct_answers" AS ENUM('never', 'after-question', 'after-submission', 'after-all-attempts');
  CREATE TYPE "public"."enum_content_items_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_user_progress_status" AS ENUM('not-started', 'in-progress', 'completed', 'paused', 'dropped');
  CREATE TYPE "public"."enum_questions_type" AS ENUM('multiple-choice', 'true-false', 'short-answer');
  CREATE TYPE "public"."enum_questions_correct_answer_true_false" AS ENUM('true', 'false');
  CREATE TYPE "public"."enum_quiz_attempts_status" AS ENUM('in-progress', 'completed', 'abandoned', 'expired');
  CREATE TYPE "public"."enum_quiz_attempts_scoring_grade" AS ENUM('a-plus', 'a', 'a-minus', 'b-plus', 'b', 'b-minus', 'c-plus', 'c', 'c-minus', 'd-plus', 'd', 'd-minus', 'f');
  CREATE TYPE "public"."enum_quiz_attempts_metadata_device_type" AS ENUM('desktop', 'mobile', 'tablet');
  CREATE TYPE "public"."enum_enrollments_status" AS ENUM('active', 'completed', 'suspended', 'cancelled', 'expired', 'pending');
  CREATE TYPE "public"."enum_enrollments_enrollment_type" AS ENUM('paid', 'free', 'trial', 'scholarship', 'staff', 'beta');
  CREATE TYPE "public"."enum_enrollments_access_level" AS ENUM('full', 'preview', 'limited', 'audit');
  CREATE TYPE "public"."enum_enrollments_payment_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled', 'free');
  CREATE TYPE "public"."enum_enrollments_metadata_enrollment_reason" AS ENUM('professional', 'personal', 'academic', 'company', 'career-change', 'other');
  CREATE TYPE "public"."enum_transactions_type" AS ENUM('course_purchase', 'subscription_initial', 'subscription_renewal', 'subscription_upgrade', 'subscription_downgrade', 'refund', 'credit', 'other');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed');
  CREATE TYPE "public"."enum_transactions_payment_method" AS ENUM('credit_card', 'bank_transfer', 'invoice', 'paypal', 'apple_pay', 'google_pay', 'klarna', 'swish', 'other');
  CREATE TYPE "public"."enum_transactions_currency" AS ENUM('sek', 'eur', 'usd', 'gbp', 'other');
  CREATE TYPE "public"."enum_transactions_payment_processor_processor" AS ENUM('stripe', 'paypal', 'manual', 'other');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused');
  CREATE TYPE "public"."enum_subscriptions_plan_id" AS ENUM('wine_club_monthly', 'wine_club_yearly');
  CREATE TYPE "public"."enum_subscriptions_interval" AS ENUM('month', 'year');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('card', 'klarna');
  CREATE TYPE "public"."enum_grapes_color" AS ENUM('red', 'white');
  CREATE TYPE "public"."enum_reviews_wset_tasting_nose_primary_aromas" AS ENUM('Jordgubbe', 'Päron', 'Persika', 'Apelsin', 'Citron', 'Äpple', 'Krusbär', 'Grapefrukt', 'Druva', 'Lime', 'Aprikos', 'Banan', 'Nektarin', 'Litchi', 'Mango', 'Passionsfrukt', 'Melon', 'Ananas', 'Tranbär', 'Röda vinbär', 'Hallon', 'Röda körsbär', 'Svarta vinbär', 'Björnbär', 'Mörka körsbär', 'Blåbär', 'Mörka plommon', 'Röda plommon', 'Blomma', 'Ros', 'Viol', 'Grön paprika', 'Gräs', 'Tomatblad', 'Sparris', 'Eukalyptus', 'Mynta', 'Fänkål', 'Dill', 'Torkade örter', 'Svart- & Vitpeppar', 'Lakrits', 'Omogen frukt', 'Mogen frukt', 'Blöta stenar');
  CREATE TYPE "public"."enum_reviews_wset_tasting_nose_secondary_aromas" AS ENUM('Vanilj', 'Ceder', 'Kex', 'Bröd', 'Bröddeg', 'yoghurt', 'Grädde', 'Smör', 'Ost', 'Kokosnöt', 'Förkolnat trä', 'Rök', 'Godis', 'Bakverk', 'Rostat bröd', 'Kryddnejlika', 'Kanel', 'Muskot', 'Ingefära', 'Kokt frukt', 'Kaffe');
  CREATE TYPE "public"."enum_reviews_wset_tasting_nose_tertiary_aromas" AS ENUM('Choklad', 'Läder', 'Kola', 'Jord', 'Svamp', 'Kött', 'Tobak', 'Blöta löv', 'Skogsbotten', 'Apelsinmarmelad', 'Bensin', 'Mandel', 'Hasselnöt', 'Honung', 'Torkad frukt');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_primary_flavours" AS ENUM('Jordgubbe', 'Päron', 'Persika', 'Apelsin', 'Citron', 'Äpple', 'Krusbär', 'Grapefrukt', 'Druva', 'Lime', 'Aprikos', 'Banan', 'Nektarin', 'Litchi', 'Mango', 'Passionsfrukt', 'Melon', 'Ananas', 'Tranbär', 'Röda vinbär', 'Hallon', 'Röda körsbär', 'Svarta vinbär', 'Björnbär', 'Mörka körsbär', 'Blåbär', 'Mörka plommon', 'Röda plommon', 'Blomma', 'Ros', 'Viol', 'Grön paprika', 'Gräs', 'Tomatblad', 'Sparris', 'Eukalyptus', 'Mynta', 'Fänkål', 'Dill', 'Torkade örter', 'Svart- & Vitpeppar', 'Lakrits', 'Omogen frukt', 'Mogen frukt', 'Blöta stenar');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_secondary_flavours" AS ENUM('Vanilj', 'Ceder', 'Kex', 'Bröd', 'Bröddeg', 'yoghurt', 'Grädde', 'Smör', 'Ost', 'Kokosnöt', 'Förkolnat trä', 'Rök', 'Godis', 'Bakverk', 'Rostat bröd', 'Kryddnejlika', 'Kanel', 'Muskot', 'Ingefära', 'Kokt frukt', 'Kaffe');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_tertiary_flavours" AS ENUM('Choklad', 'Läder', 'Kola', 'Jord', 'Svamp', 'Kött', 'Tobak', 'Blöta löv', 'Skogsbotten', 'Apelsinmarmelad', 'Bensin', 'Mandel', 'Hasselnöt', 'Honung', 'Torkad frukt');
  CREATE TYPE "public"."enum_reviews_wset_tasting_appearance_clarity" AS ENUM('Klar', 'Oklar');
  CREATE TYPE "public"."enum_reviews_wset_tasting_appearance_intensity" AS ENUM('Blek', 'Mellan', 'Djup');
  CREATE TYPE "public"."enum_reviews_wset_tasting_appearance_color" AS ENUM('Citrongul', 'Guld', 'Bärnstensfärgad', 'Rosa', 'Rosa-orange', 'Orange', 'Lila', 'Rubinröd', 'Granatröd', 'Läderfärgad');
  CREATE TYPE "public"."enum_reviews_wset_tasting_nose_intensity" AS ENUM('Låg', 'Mellan', 'Hög');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_sweetness" AS ENUM('Torr', 'Halvtorr', 'Mellan', 'Söt');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_acidity" AS ENUM('Låg', 'Mellan', 'Hög');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_tannin" AS ENUM('Låg', 'Mellan', 'Hög');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_alcohol" AS ENUM('Låg', 'Mellan', 'Hög');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_body" AS ENUM('Lätt', 'Mellan', 'Fyllig');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_flavour_intensity" AS ENUM('Låg', 'Medium', 'Uttalad');
  CREATE TYPE "public"."enum_reviews_wset_tasting_palate_finish" AS ENUM('Kort', 'Mellan', 'Lång');
  CREATE TYPE "public"."enum_reviews_wset_tasting_conclusion_quality" AS ENUM('Dålig', 'Acceptabel', 'Bra', 'Mycket bra', 'Enastående');
  CREATE TYPE "public"."enum_course_reviews_status" AS ENUM('published', 'pending');
  CREATE TYPE "public"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_blog_categories_color" AS ENUM('red', 'blue', 'green', 'purple', 'orange', 'yellow', 'pink', 'gray');
  CREATE TYPE "public"."enum_blog_tags_type" AS ENUM('general', 'wine-type', 'wine-region', 'grape-variety', 'tasting-note', 'food-pairing', 'wine-technique', 'industry-topic');
  CREATE TYPE "public"."enum_blog_tags_color" AS ENUM('red', 'blue', 'green', 'purple', 'orange', 'yellow', 'pink', 'gray');
  CREATE TYPE "public"."enum_course_sessions_status" AS ENUM('active', 'paused', 'completed');
  CREATE TYPE "public"."enum_course_sessions_current_activity" AS ENUM('waiting', 'video', 'quiz', 'wine_review', 'results');
  CREATE TABLE IF NOT EXISTS "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"prefix" varchar DEFAULT 'production',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_profile_url" varchar,
  	"sizes_profile_width" numeric,
  	"sizes_profile_height" numeric,
  	"sizes_profile_mime_type" varchar,
  	"sizes_profile_filesize" numeric,
  	"sizes_profile_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_feature_url" varchar,
  	"sizes_feature_width" numeric,
  	"sizes_feature_height" numeric,
  	"sizes_feature_mime_type" varchar,
  	"sizes_feature_filesize" numeric,
  	"sizes_feature_filename" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "users_wine_preferences_preferred_styles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_wine_preferences_preferred_styles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "users_wine_preferences_discovery_preferences" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_wine_preferences_discovery_preferences",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "users_course_progress" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"course_id" varchar NOT NULL,
  	"progress" numeric DEFAULT 0,
  	"last_accessed" timestamp(3) with time zone,
  	"completed" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"avatar_id" integer,
  	"bio" varchar,
  	"role" "enum_users_role" DEFAULT 'user' NOT NULL,
  	"is_verified" boolean DEFAULT false,
  	"account_status" "enum_users_account_status" DEFAULT 'active',
  	"subscription_status" "enum_users_subscription_status" DEFAULT 'none',
  	"subscription_plan" "enum_users_subscription_plan" DEFAULT 'none',
  	"subscription_expiry" timestamp(3) with time zone,
  	"onboarding_goal" "enum_users_onboarding_goal",
  	"onboarding_completed_at" timestamp(3) with time zone,
  	"onboarding_skipped_at" timestamp(3) with time zone,
  	"onboarding_source" "enum_users_onboarding_source",
  	"wine_preferences_tasting_experience" "enum_users_wine_preferences_tasting_experience" DEFAULT 'Nybörjare',
  	"wine_preferences_price_range" "enum_users_wine_preferences_price_range" DEFAULT 'mid',
  	"wine_preferences_tasting_notes" varchar,
  	"notifications_email_course_progress" boolean DEFAULT true,
  	"notifications_email_new_courses" boolean DEFAULT true,
  	"notifications_email_wine_recommendations" boolean DEFAULT true,
  	"notifications_email_tasting_events" boolean DEFAULT true,
  	"notifications_email_newsletter" boolean DEFAULT true,
  	"notifications_email_account_updates" boolean DEFAULT true,
  	"notifications_push_course_reminders" boolean DEFAULT true,
  	"notifications_push_tasting_reminders" boolean DEFAULT true,
  	"notifications_push_achievements" boolean DEFAULT true,
  	"notifications_push_social_activity" boolean DEFAULT false,
  	"notifications_platform_in_app_messages" boolean DEFAULT true,
  	"notifications_platform_system_announcements" boolean DEFAULT true,
  	"notifications_platform_maintenance_alerts" boolean DEFAULT true,
  	"notifications_platform_feature_updates" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"grapes_id" integer,
  	"regions_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "vinprovningar_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"module_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "vinprovningar_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "vinprovningar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"full_description" jsonb,
  	"featured_image_id" integer,
  	"preview_video_provider" "enum_vinprovningar_preview_video_provider" DEFAULT 'none',
  	"preview_mux_data_asset_id" varchar,
  	"preview_mux_data_playback_id" varchar,
  	"preview_mux_data_status" "enum_vinprovningar_preview_mux_data_status",
  	"preview_mux_data_duration" numeric,
  	"preview_mux_data_aspect_ratio" varchar,
  	"preview_source_video_id" integer,
  	"price" numeric,
  	"level" "enum_vinprovningar_level",
  	"duration" numeric,
  	"is_featured" boolean DEFAULT false,
  	"instructor_id" integer,
  	"stripe_product_id" varchar,
  	"stripe_price_id" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_vinprovningar_status" DEFAULT 'draft'
  );
  
  CREATE TABLE IF NOT EXISTS "_vinprovningar_v_version_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"module_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_vinprovningar_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_vinprovningar_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_full_description" jsonb,
  	"version_featured_image_id" integer,
  	"version_preview_video_provider" "enum__vinprovningar_v_version_preview_video_provider" DEFAULT 'none',
  	"version_preview_mux_data_asset_id" varchar,
  	"version_preview_mux_data_playback_id" varchar,
  	"version_preview_mux_data_status" "enum__vinprovningar_v_version_preview_mux_data_status",
  	"version_preview_mux_data_duration" numeric,
  	"version_preview_mux_data_aspect_ratio" varchar,
  	"version_preview_source_video_id" integer,
  	"version_price" numeric,
  	"version_level" "enum__vinprovningar_v_version_level",
  	"version_duration" numeric,
  	"version_is_featured" boolean DEFAULT false,
  	"version_instructor_id" integer,
  	"version_stripe_product_id" varchar,
  	"version_stripe_price_id" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__vinprovningar_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE IF NOT EXISTS "modules_content_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content_item_id" integer NOT NULL,
  	"is_free" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "modules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "content_items_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer,
  	"required" boolean DEFAULT true
  );
  
  CREATE TABLE IF NOT EXISTS "content_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"content_type" "enum_content_items_content_type" DEFAULT 'lesson' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"content" jsonb,
  	"video_provider" "enum_content_items_video_provider" DEFAULT 'none',
  	"mux_data_asset_id" varchar,
  	"mux_data_playback_id" varchar,
  	"mux_data_status" "enum_content_items_mux_data_status",
  	"mux_data_duration" numeric,
  	"mux_data_aspect_ratio" varchar,
  	"video_url" varchar,
  	"source_video_id" integer,
  	"lesson_type" "enum_content_items_lesson_type" DEFAULT 'video',
  	"answer_key_review_id" integer,
  	"quiz_settings_passing_score" numeric DEFAULT 70,
  	"quiz_settings_randomize_questions" boolean DEFAULT false,
  	"quiz_settings_randomize_answers" boolean DEFAULT false,
  	"quiz_settings_show_correct_answers" "enum_content_items_quiz_settings_show_correct_answers" DEFAULT 'after-submission',
  	"analytics_total_attempts" numeric DEFAULT 0,
  	"analytics_average_score" numeric,
  	"analytics_pass_rate" numeric,
  	"analytics_average_time_spent" numeric,
  	"status" "enum_content_items_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress_scores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lesson_id" integer NOT NULL,
  	"score" numeric NOT NULL,
  	"attempts" numeric DEFAULT 1 NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress_quiz_scores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quiz_id" integer NOT NULL,
  	"score" numeric NOT NULL,
  	"attempts" numeric DEFAULT 1 NOT NULL,
  	"passed" boolean DEFAULT false,
  	"completed_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress_lesson_states" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lesson_id" integer NOT NULL,
  	"progress" numeric DEFAULT 0,
  	"position_seconds" numeric,
  	"duration_seconds" numeric,
  	"last_watched_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lesson_id" integer NOT NULL,
  	"note" jsonb NOT NULL,
  	"timestamp" numeric
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"course_id" integer NOT NULL,
  	"course_title" varchar,
  	"status" "enum_user_progress_status" DEFAULT 'not-started' NOT NULL,
  	"progress_percentage" numeric DEFAULT 0,
  	"enrolled_at" timestamp(3) with time zone,
  	"started_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"last_accessed_at" timestamp(3) with time zone,
  	"time_spent" numeric DEFAULT 0,
  	"current_module_id" integer,
  	"current_lesson_id" integer,
  	"certificate_issued" boolean DEFAULT false,
  	"certificate_issued_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_progress_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"modules_id" integer,
  	"content_items_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "questions_acceptable_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"answer" varchar,
  	"case_sensitive" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "enum_questions_type" DEFAULT 'multiple-choice' NOT NULL,
  	"content" jsonb,
  	"correct_answer_true_false" "enum_questions_correct_answer_true_false",
  	"correct_answer" varchar,
  	"explanation" jsonb,
  	"points" numeric DEFAULT 1 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "quiz_attempts_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer NOT NULL,
  	"answer" jsonb,
  	"is_correct" boolean,
  	"points_awarded" numeric DEFAULT 0,
  	"time_spent" numeric,
  	"answered_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"quiz_id" integer NOT NULL,
  	"attempt_number" numeric NOT NULL,
  	"status" "enum_quiz_attempts_status" DEFAULT 'in-progress' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone,
  	"time_spent" numeric,
  	"scoring_total_points" numeric DEFAULT 0,
  	"scoring_max_points" numeric DEFAULT 0,
  	"scoring_score" numeric,
  	"scoring_passed" boolean,
  	"scoring_grade" "enum_quiz_attempts_scoring_grade",
  	"feedback_auto_feedback" jsonb,
  	"feedback_instructor_feedback" jsonb,
  	"feedback_feedback_given_at" timestamp(3) with time zone,
  	"metadata_ip_address" varchar,
  	"metadata_user_agent" varchar,
  	"metadata_device_type" "enum_quiz_attempts_metadata_device_type",
  	"metadata_browser_info" jsonb,
  	"flags_is_retake" boolean DEFAULT false,
  	"flags_has_extended_time" boolean DEFAULT false,
  	"flags_proctored" boolean DEFAULT false,
  	"flags_flagged_for_review" boolean DEFAULT false,
  	"flags_review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "enrollments_restrictions_allowed_ip_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ip_address" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "enrollments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"course_id" integer NOT NULL,
  	"status" "enum_enrollments_status" DEFAULT 'active' NOT NULL,
  	"enrollment_type" "enum_enrollments_enrollment_type" DEFAULT 'paid' NOT NULL,
  	"enrolled_at" timestamp(3) with time zone NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"access_level" "enum_enrollments_access_level" DEFAULT 'full',
  	"permissions_can_view_content" boolean DEFAULT true,
  	"permissions_can_take_quizzes" boolean DEFAULT true,
  	"permissions_can_download_files" boolean DEFAULT true,
  	"permissions_can_post_comments" boolean DEFAULT true,
  	"permissions_can_view_grades" boolean DEFAULT true,
  	"permissions_can_receive_certificate" boolean DEFAULT true,
  	"payment_payment_status" "enum_enrollments_payment_payment_status" DEFAULT 'pending',
  	"payment_amount" numeric,
  	"payment_currency" varchar DEFAULT 'SEK',
  	"payment_transaction_id" varchar,
  	"payment_paid_at" timestamp(3) with time zone,
  	"progress_completion_percentage" numeric DEFAULT 0,
  	"progress_last_accessed_at" timestamp(3) with time zone,
  	"progress_time_spent" numeric DEFAULT 0,
  	"progress_current_module_id" integer,
  	"progress_current_lesson_id" integer,
  	"progress_completed_at" timestamp(3) with time zone,
  	"restrictions_max_login_attempts" numeric DEFAULT 0,
  	"restrictions_allowed_devices" numeric DEFAULT 0,
  	"restrictions_requires_proctoring" boolean DEFAULT false,
  	"restrictions_offline_access" boolean DEFAULT false,
  	"review_tracking_review_threshold_reached_at" timestamp(3) with time zone,
  	"review_tracking_review_email_sent_at" timestamp(3) with time zone,
  	"review_tracking_review_email_token" varchar,
  	"notes_admin_notes" jsonb,
  	"notes_student_notes" jsonb,
  	"notes_special_instructions" jsonb,
  	"metadata_referral_source" varchar,
  	"metadata_coupon_code" varchar,
  	"metadata_enrollment_reason" "enum_enrollments_metadata_enrollment_reason",
  	"metadata_expected_completion_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "wines_food_pairings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pairing" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "wines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"winery" varchar NOT NULL,
  	"vintage" numeric,
  	"non_vintage" boolean DEFAULT false,
  	"country_id" integer NOT NULL,
  	"region_id" integer NOT NULL,
  	"price" numeric,
  	"systembolaget_url" varchar,
  	"image_id" integer,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "wines_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"grapes_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "user_wines_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_wines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"user_id" integer NOT NULL,
  	"wine_id" integer NOT NULL,
  	"list_id" integer NOT NULL,
  	"rating" numeric,
  	"notes" jsonb,
  	"purchase_info_purchase_date" timestamp(3) with time zone,
  	"purchase_info_purchase_location" varchar,
  	"purchase_info_price" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"transaction_id" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"type" "enum_transactions_type" NOT NULL,
  	"amount" numeric NOT NULL,
  	"status" "enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"payment_method" "enum_transactions_payment_method" NOT NULL,
  	"currency" "enum_transactions_currency" DEFAULT 'sek' NOT NULL,
  	"related_course_id" integer,
  	"payment_processor_processor" "enum_transactions_payment_processor_processor" DEFAULT 'stripe' NOT NULL,
  	"payment_processor_processor_transaction_id" varchar,
  	"payment_processor_processor_fee" numeric,
  	"payment_processor_processor_response" jsonb,
  	"notes" varchar,
  	"customer_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "subscriptions_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subscription_number" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_subscriptions_status" DEFAULT 'active' NOT NULL,
  	"plan_id" "enum_subscriptions_plan_id" NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'SEK' NOT NULL,
  	"interval" "enum_subscriptions_interval" NOT NULL,
  	"stripe_subscription_id" varchar,
  	"stripe_customer_id" varchar,
  	"stripe_price_id" varchar,
  	"current_period_start" timestamp(3) with time zone NOT NULL,
  	"current_period_end" timestamp(3) with time zone NOT NULL,
  	"trial_start" timestamp(3) with time zone,
  	"trial_end" timestamp(3) with time zone,
  	"cancel_at" timestamp(3) with time zone,
  	"cancel_at_period_end" boolean DEFAULT false,
  	"canceled_at" timestamp(3) with time zone,
  	"default_payment_method" jsonb,
  	"latest_invoice" varchar,
  	"discount_percent" numeric,
  	"notes" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "subscriptions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"vinprovningar_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"course_id" integer NOT NULL,
  	"price" numeric NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'SEK' NOT NULL,
  	"discount_amount" numeric DEFAULT 0,
  	"discount_code" varchar,
  	"stripe_payment_intent_id" varchar,
  	"stripe_session_id" varchar,
  	"stripe_customer_id" varchar,
  	"stripe_charge_id" varchar,
  	"payment_method" "enum_orders_payment_method",
  	"payment_method_details" jsonb,
  	"invoice_url" varchar,
  	"receipt_url" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"failed_at" timestamp(3) with time zone,
  	"refunded_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "grapes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"color" "enum_grapes_color",
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "countries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "regions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"country_id" integer NOT NULL,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "user_wine_lists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"is_system" boolean DEFAULT false,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_nose_primary_aromas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_nose_primary_aromas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_nose_secondary_aromas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_nose_secondary_aromas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_nose_tertiary_aromas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_nose_tertiary_aromas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_palate_primary_flavours" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_palate_primary_flavours",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_palate_secondary_flavours" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_palate_secondary_flavours",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews_wset_tasting_palate_tertiary_flavours" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_wset_tasting_palate_tertiary_flavours",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"wine_id" integer NOT NULL,
  	"user_id" integer,
  	"session_participant_id" integer,
  	"session_id" integer,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"rating" numeric NOT NULL,
  	"review_text" jsonb,
  	"is_trusted" boolean DEFAULT false,
  	"wset_tasting_appearance_clarity" "enum_reviews_wset_tasting_appearance_clarity",
  	"wset_tasting_appearance_intensity" "enum_reviews_wset_tasting_appearance_intensity",
  	"wset_tasting_appearance_color" "enum_reviews_wset_tasting_appearance_color",
  	"wset_tasting_nose_intensity" "enum_reviews_wset_tasting_nose_intensity",
  	"wset_tasting_palate_sweetness" "enum_reviews_wset_tasting_palate_sweetness",
  	"wset_tasting_palate_acidity" "enum_reviews_wset_tasting_palate_acidity",
  	"wset_tasting_palate_tannin" "enum_reviews_wset_tasting_palate_tannin",
  	"wset_tasting_palate_alcohol" "enum_reviews_wset_tasting_palate_alcohol",
  	"wset_tasting_palate_body" "enum_reviews_wset_tasting_palate_body",
  	"wset_tasting_palate_flavour_intensity" "enum_reviews_wset_tasting_palate_flavour_intensity",
  	"wset_tasting_palate_finish" "enum_reviews_wset_tasting_palate_finish",
  	"wset_tasting_conclusion_quality" "enum_reviews_wset_tasting_conclusion_quality",
  	"wset_tasting_conclusion_summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "course_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"course_id" integer NOT NULL,
  	"author_id" integer NOT NULL,
  	"rating" numeric NOT NULL,
  	"content" varchar NOT NULL,
  	"status" "enum_course_reviews_status" DEFAULT 'published' NOT NULL,
  	"is_verified_purchase" boolean DEFAULT false,
  	"review_token" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"featured_image_id" integer,
  	"author_id" integer,
  	"category_id" integer,
  	"published_date" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_blog_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE IF NOT EXISTS "blog_posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blog_tags_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_featured_image_id" integer,
  	"version_author_id" integer,
  	"version_category_id" integer,
  	"version_published_date" timestamp(3) with time zone,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blog_tags_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "blog_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"color" "enum_blog_categories_color" DEFAULT 'blue',
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blog_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"type" "enum_blog_tags_type" DEFAULT 'general',
  	"color" "enum_blog_tags_color" DEFAULT 'gray',
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "course_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"course_id" integer NOT NULL,
  	"current_lesson_id" integer,
  	"current_quiz_id" integer,
  	"host_id" integer NOT NULL,
  	"join_code" varchar NOT NULL,
  	"session_name" varchar,
  	"status" "enum_course_sessions_status" DEFAULT 'active' NOT NULL,
  	"current_activity" "enum_course_sessions_current_activity" DEFAULT 'waiting' NOT NULL,
  	"participant_count" numeric DEFAULT 0,
  	"max_participants" numeric DEFAULT 50,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "session_participants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" integer NOT NULL,
  	"nickname" varchar NOT NULL,
  	"participant_token" varchar NOT NULL,
  	"user_id" integer,
  	"is_active" boolean DEFAULT true,
  	"last_activity_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"users_id" integer,
  	"vinprovningar_id" integer,
  	"modules_id" integer,
  	"content_items_id" integer,
  	"user_progress_id" integer,
  	"questions_id" integer,
  	"quiz_attempts_id" integer,
  	"enrollments_id" integer,
  	"wines_id" integer,
  	"user_wines_id" integer,
  	"transactions_id" integer,
  	"subscriptions_id" integer,
  	"orders_id" integer,
  	"grapes_id" integer,
  	"countries_id" integer,
  	"regions_id" integer,
  	"user_wine_lists_id" integer,
  	"reviews_id" integer,
  	"course_reviews_id" integer,
  	"blog_posts_id" integer,
  	"blog_categories_id" integer,
  	"blog_tags_id" integer,
  	"course_sessions_id" integer,
  	"session_participants_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DO $$ BEGIN
   ALTER TABLE "users_wine_preferences_preferred_styles" ADD CONSTRAINT "users_wine_preferences_preferred_styles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_wine_preferences_discovery_preferences" ADD CONSTRAINT "users_wine_preferences_discovery_preferences_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_course_progress" ADD CONSTRAINT "users_course_progress_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_grapes_fk" FOREIGN KEY ("grapes_id") REFERENCES "public"."grapes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar_modules" ADD CONSTRAINT "vinprovningar_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar_modules" ADD CONSTRAINT "vinprovningar_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar_tags" ADD CONSTRAINT "vinprovningar_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar" ADD CONSTRAINT "vinprovningar_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar" ADD CONSTRAINT "vinprovningar_preview_source_video_id_media_id_fk" FOREIGN KEY ("preview_source_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar" ADD CONSTRAINT "vinprovningar_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinprovningar" ADD CONSTRAINT "vinprovningar_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v_version_modules" ADD CONSTRAINT "_vinprovningar_v_version_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v_version_modules" ADD CONSTRAINT "_vinprovningar_v_version_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_vinprovningar_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v_version_tags" ADD CONSTRAINT "_vinprovningar_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_vinprovningar_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v" ADD CONSTRAINT "_vinprovningar_v_parent_id_vinprovningar_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v" ADD CONSTRAINT "_vinprovningar_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v" ADD CONSTRAINT "_vinprovningar_v_version_preview_source_video_id_media_id_fk" FOREIGN KEY ("version_preview_source_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v" ADD CONSTRAINT "_vinprovningar_v_version_instructor_id_users_id_fk" FOREIGN KEY ("version_instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_vinprovningar_v" ADD CONSTRAINT "_vinprovningar_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "modules_content_items" ADD CONSTRAINT "modules_content_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "modules_content_items" ADD CONSTRAINT "modules_content_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "content_items_questions" ADD CONSTRAINT "content_items_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "content_items_questions" ADD CONSTRAINT "content_items_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_video_id_media_id_fk" FOREIGN KEY ("source_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "content_items" ADD CONSTRAINT "content_items_answer_key_review_id_reviews_id_fk" FOREIGN KEY ("answer_key_review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_scores" ADD CONSTRAINT "user_progress_scores_lesson_id_content_items_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_scores" ADD CONSTRAINT "user_progress_scores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_quiz_scores" ADD CONSTRAINT "user_progress_quiz_scores_quiz_id_content_items_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_quiz_scores" ADD CONSTRAINT "user_progress_quiz_scores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_lesson_states" ADD CONSTRAINT "user_progress_lesson_states_lesson_id_content_items_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_lesson_states" ADD CONSTRAINT "user_progress_lesson_states_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_notes" ADD CONSTRAINT "user_progress_notes_lesson_id_content_items_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_notes" ADD CONSTRAINT "user_progress_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_course_id_vinprovningar_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_current_module_id_modules_id_fk" FOREIGN KEY ("current_module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_current_lesson_id_content_items_id_fk" FOREIGN KEY ("current_lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_rels" ADD CONSTRAINT "user_progress_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_rels" ADD CONSTRAINT "user_progress_rels_modules_fk" FOREIGN KEY ("modules_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_progress_rels" ADD CONSTRAINT "user_progress_rels_content_items_fk" FOREIGN KEY ("content_items_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "questions_options" ADD CONSTRAINT "questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "questions_acceptable_answers" ADD CONSTRAINT "questions_acceptable_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "quiz_attempts_answers" ADD CONSTRAINT "quiz_attempts_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "quiz_attempts_answers" ADD CONSTRAINT "quiz_attempts_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_content_items_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "enrollments_restrictions_allowed_ip_addresses" ADD CONSTRAINT "enrollments_restrictions_allowed_ip_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_vinprovningar_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_progress_current_module_id_modules_id_fk" FOREIGN KEY ("progress_current_module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_progress_current_lesson_id_content_items_id_fk" FOREIGN KEY ("progress_current_lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines_food_pairings" ADD CONSTRAINT "wines_food_pairings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines" ADD CONSTRAINT "wines_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines" ADD CONSTRAINT "wines_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines" ADD CONSTRAINT "wines_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines" ADD CONSTRAINT "wines_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines_rels" ADD CONSTRAINT "wines_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wines_rels" ADD CONSTRAINT "wines_rels_grapes_fk" FOREIGN KEY ("grapes_id") REFERENCES "public"."grapes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wines_tags" ADD CONSTRAINT "user_wines_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wines" ADD CONSTRAINT "user_wines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wines" ADD CONSTRAINT "user_wines_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wines" ADD CONSTRAINT "user_wines_list_id_user_wine_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_wine_lists"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_course_id_vinprovningar_id_fk" FOREIGN KEY ("related_course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions_features" ADD CONSTRAINT "subscriptions_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_vinprovningar_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_course_id_vinprovningar_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "grapes" ADD CONSTRAINT "grapes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "grapes" ADD CONSTRAINT "grapes_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "countries" ADD CONSTRAINT "countries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "countries" ADD CONSTRAINT "countries_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "countries" ADD CONSTRAINT "countries_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "regions" ADD CONSTRAINT "regions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "regions" ADD CONSTRAINT "regions_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "regions" ADD CONSTRAINT "regions_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wine_lists" ADD CONSTRAINT "user_wine_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wine_lists" ADD CONSTRAINT "user_wine_lists_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "user_wine_lists" ADD CONSTRAINT "user_wine_lists_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_nose_primary_aromas" ADD CONSTRAINT "reviews_wset_tasting_nose_primary_aromas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_nose_secondary_aromas" ADD CONSTRAINT "reviews_wset_tasting_nose_secondary_aromas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_nose_tertiary_aromas" ADD CONSTRAINT "reviews_wset_tasting_nose_tertiary_aromas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_palate_primary_flavours" ADD CONSTRAINT "reviews_wset_tasting_palate_primary_flavours_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_palate_secondary_flavours" ADD CONSTRAINT "reviews_wset_tasting_palate_secondary_flavours_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews_wset_tasting_palate_tertiary_flavours" ADD CONSTRAINT "reviews_wset_tasting_palate_tertiary_flavours_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_session_participant_id_session_participants_id_fk" FOREIGN KEY ("session_participant_id") REFERENCES "public"."session_participants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "reviews" ADD CONSTRAINT "reviews_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_vinprovningar_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_posts_rels" ADD CONSTRAINT "blog_posts_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_category_id_blog_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_posts_v_rels" ADD CONSTRAINT "_blog_posts_v_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_tags" ADD CONSTRAINT "blog_tags_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_tags" ADD CONSTRAINT "blog_tags_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_course_id_vinprovningar_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_current_lesson_id_content_items_id_fk" FOREIGN KEY ("current_lesson_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_current_quiz_id_content_items_id_fk" FOREIGN KEY ("current_quiz_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinprovningar_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_modules_fk" FOREIGN KEY ("modules_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_items_fk" FOREIGN KEY ("content_items_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_progress_fk" FOREIGN KEY ("user_progress_id") REFERENCES "public"."user_progress"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quiz_attempts_fk" FOREIGN KEY ("quiz_attempts_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enrollments_fk" FOREIGN KEY ("enrollments_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wines_fk" FOREIGN KEY ("wines_id") REFERENCES "public"."wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_wines_fk" FOREIGN KEY ("user_wines_id") REFERENCES "public"."user_wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_grapes_fk" FOREIGN KEY ("grapes_id") REFERENCES "public"."grapes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_countries_fk" FOREIGN KEY ("countries_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_wine_lists_fk" FOREIGN KEY ("user_wine_lists_id") REFERENCES "public"."user_wine_lists"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_reviews_fk" FOREIGN KEY ("course_reviews_id") REFERENCES "public"."course_reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_categories_fk" FOREIGN KEY ("blog_categories_id") REFERENCES "public"."blog_categories"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_sessions_fk" FOREIGN KEY ("course_sessions_id") REFERENCES "public"."course_sessions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_session_participants_fk" FOREIGN KEY ("session_participants_id") REFERENCES "public"."session_participants"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_profile_sizes_profile_filename_idx" ON "media" USING btree ("sizes_profile_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_feature_sizes_feature_filename_idx" ON "media" USING btree ("sizes_feature_filename");
  CREATE INDEX IF NOT EXISTS "users_wine_preferences_preferred_styles_order_idx" ON "users_wine_preferences_preferred_styles" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "users_wine_preferences_preferred_styles_parent_idx" ON "users_wine_preferences_preferred_styles" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "users_wine_preferences_discovery_preferences_order_idx" ON "users_wine_preferences_discovery_preferences" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "users_wine_preferences_discovery_preferences_parent_idx" ON "users_wine_preferences_discovery_preferences" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "users_course_progress_order_idx" ON "users_course_progress" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "users_course_progress_parent_id_idx" ON "users_course_progress" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "users_rels_grapes_id_idx" ON "users_rels" USING btree ("grapes_id");
  CREATE INDEX IF NOT EXISTS "users_rels_regions_id_idx" ON "users_rels" USING btree ("regions_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_modules_order_idx" ON "vinprovningar_modules" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "vinprovningar_modules_parent_id_idx" ON "vinprovningar_modules" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_modules_module_idx" ON "vinprovningar_modules" USING btree ("module_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_tags_order_idx" ON "vinprovningar_tags" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "vinprovningar_tags_parent_id_idx" ON "vinprovningar_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "vinprovningar_slug_idx" ON "vinprovningar" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "vinprovningar_featured_image_idx" ON "vinprovningar" USING btree ("featured_image_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_preview_source_video_idx" ON "vinprovningar" USING btree ("preview_source_video_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_instructor_idx" ON "vinprovningar" USING btree ("instructor_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_seo_image_idx" ON "vinprovningar" USING btree ("seo_image_id");
  CREATE INDEX IF NOT EXISTS "vinprovningar_updated_at_idx" ON "vinprovningar" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "vinprovningar_created_at_idx" ON "vinprovningar" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "vinprovningar__status_idx" ON "vinprovningar" USING btree ("_status");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_modules_order_idx" ON "_vinprovningar_v_version_modules" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_modules_parent_id_idx" ON "_vinprovningar_v_version_modules" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_modules_module_idx" ON "_vinprovningar_v_version_modules" USING btree ("module_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_tags_order_idx" ON "_vinprovningar_v_version_tags" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_tags_parent_id_idx" ON "_vinprovningar_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_parent_idx" ON "_vinprovningar_v" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_slug_idx" ON "_vinprovningar_v" USING btree ("version_slug");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_featured_image_idx" ON "_vinprovningar_v" USING btree ("version_featured_image_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_preview_source_video_idx" ON "_vinprovningar_v" USING btree ("version_preview_source_video_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_instructor_idx" ON "_vinprovningar_v" USING btree ("version_instructor_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_seo_image_idx" ON "_vinprovningar_v" USING btree ("version_seo_image_id");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_updated_at_idx" ON "_vinprovningar_v" USING btree ("version_updated_at");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version_created_at_idx" ON "_vinprovningar_v" USING btree ("version_created_at");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_version_version__status_idx" ON "_vinprovningar_v" USING btree ("version__status");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_created_at_idx" ON "_vinprovningar_v" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_updated_at_idx" ON "_vinprovningar_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_latest_idx" ON "_vinprovningar_v" USING btree ("latest");
  CREATE INDEX IF NOT EXISTS "_vinprovningar_v_autosave_idx" ON "_vinprovningar_v" USING btree ("autosave");
  CREATE INDEX IF NOT EXISTS "modules_content_items_order_idx" ON "modules_content_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "modules_content_items_parent_id_idx" ON "modules_content_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "modules_content_items_content_item_idx" ON "modules_content_items" USING btree ("content_item_id");
  CREATE INDEX IF NOT EXISTS "modules_updated_at_idx" ON "modules" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "modules_created_at_idx" ON "modules" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "content_items_questions_order_idx" ON "content_items_questions" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "content_items_questions_parent_id_idx" ON "content_items_questions" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "content_items_questions_question_idx" ON "content_items_questions" USING btree ("question_id");
  CREATE INDEX IF NOT EXISTS "content_items_source_video_idx" ON "content_items" USING btree ("source_video_id");
  CREATE INDEX IF NOT EXISTS "content_items_answer_key_review_idx" ON "content_items" USING btree ("answer_key_review_id");
  CREATE INDEX IF NOT EXISTS "content_items_updated_at_idx" ON "content_items" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "content_items_created_at_idx" ON "content_items" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "user_progress_scores_order_idx" ON "user_progress_scores" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "user_progress_scores_parent_id_idx" ON "user_progress_scores" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "user_progress_scores_lesson_idx" ON "user_progress_scores" USING btree ("lesson_id");
  CREATE INDEX IF NOT EXISTS "user_progress_quiz_scores_order_idx" ON "user_progress_quiz_scores" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "user_progress_quiz_scores_parent_id_idx" ON "user_progress_quiz_scores" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "user_progress_quiz_scores_quiz_idx" ON "user_progress_quiz_scores" USING btree ("quiz_id");
  CREATE INDEX IF NOT EXISTS "user_progress_lesson_states_order_idx" ON "user_progress_lesson_states" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "user_progress_lesson_states_parent_id_idx" ON "user_progress_lesson_states" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "user_progress_lesson_states_lesson_idx" ON "user_progress_lesson_states" USING btree ("lesson_id");
  CREATE INDEX IF NOT EXISTS "user_progress_notes_order_idx" ON "user_progress_notes" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "user_progress_notes_parent_id_idx" ON "user_progress_notes" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "user_progress_notes_lesson_idx" ON "user_progress_notes" USING btree ("lesson_id");
  CREATE INDEX IF NOT EXISTS "user_progress_user_idx" ON "user_progress" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "user_progress_course_idx" ON "user_progress" USING btree ("course_id");
  CREATE INDEX IF NOT EXISTS "user_progress_current_module_idx" ON "user_progress" USING btree ("current_module_id");
  CREATE INDEX IF NOT EXISTS "user_progress_current_lesson_idx" ON "user_progress" USING btree ("current_lesson_id");
  CREATE INDEX IF NOT EXISTS "user_progress_updated_at_idx" ON "user_progress" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "user_progress_created_at_idx" ON "user_progress" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "user_progress_rels_order_idx" ON "user_progress_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "user_progress_rels_parent_idx" ON "user_progress_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "user_progress_rels_path_idx" ON "user_progress_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "user_progress_rels_modules_id_idx" ON "user_progress_rels" USING btree ("modules_id");
  CREATE INDEX IF NOT EXISTS "user_progress_rels_content_items_id_idx" ON "user_progress_rels" USING btree ("content_items_id");
  CREATE INDEX IF NOT EXISTS "questions_options_order_idx" ON "questions_options" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "questions_options_parent_id_idx" ON "questions_options" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "questions_acceptable_answers_order_idx" ON "questions_acceptable_answers" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "questions_acceptable_answers_parent_id_idx" ON "questions_acceptable_answers" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "questions_updated_at_idx" ON "questions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "questions_created_at_idx" ON "questions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_answers_order_idx" ON "quiz_attempts_answers" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_answers_parent_id_idx" ON "quiz_attempts_answers" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_answers_question_idx" ON "quiz_attempts_answers" USING btree ("question_id");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_user_idx" ON "quiz_attempts" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_idx" ON "quiz_attempts" USING btree ("quiz_id");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_updated_at_idx" ON "quiz_attempts" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "quiz_attempts_created_at_idx" ON "quiz_attempts" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "enrollments_restrictions_allowed_ip_addresses_order_idx" ON "enrollments_restrictions_allowed_ip_addresses" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "enrollments_restrictions_allowed_ip_addresses_parent_id_idx" ON "enrollments_restrictions_allowed_ip_addresses" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "enrollments_user_idx" ON "enrollments" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "enrollments_course_idx" ON "enrollments" USING btree ("course_id");
  CREATE INDEX IF NOT EXISTS "enrollments_progress_progress_current_module_idx" ON "enrollments" USING btree ("progress_current_module_id");
  CREATE INDEX IF NOT EXISTS "enrollments_progress_progress_current_lesson_idx" ON "enrollments" USING btree ("progress_current_lesson_id");
  CREATE INDEX IF NOT EXISTS "enrollments_updated_at_idx" ON "enrollments" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "user_course_idx" ON "enrollments" USING btree ("user_id","course_id");
  CREATE INDEX IF NOT EXISTS "status_idx" ON "enrollments" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "enrolledAt_idx" ON "enrollments" USING btree ("enrolled_at");
  CREATE INDEX IF NOT EXISTS "expiresAt_idx" ON "enrollments" USING btree ("expires_at");
  CREATE INDEX IF NOT EXISTS "wines_food_pairings_order_idx" ON "wines_food_pairings" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "wines_food_pairings_parent_id_idx" ON "wines_food_pairings" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "wines_slug_idx" ON "wines" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "wines_country_idx" ON "wines" USING btree ("country_id");
  CREATE INDEX IF NOT EXISTS "wines_region_idx" ON "wines" USING btree ("region_id");
  CREATE INDEX IF NOT EXISTS "wines_image_idx" ON "wines" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "wines_seo_image_idx" ON "wines" USING btree ("seo_image_id");
  CREATE INDEX IF NOT EXISTS "wines_updated_at_idx" ON "wines" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "wines_created_at_idx" ON "wines" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "wines_rels_order_idx" ON "wines_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "wines_rels_parent_idx" ON "wines_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "wines_rels_path_idx" ON "wines_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "wines_rels_grapes_id_idx" ON "wines_rels" USING btree ("grapes_id");
  CREATE INDEX IF NOT EXISTS "user_wines_tags_order_idx" ON "user_wines_tags" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "user_wines_tags_parent_id_idx" ON "user_wines_tags" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "user_wines_user_idx" ON "user_wines" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "user_wines_wine_idx" ON "user_wines" USING btree ("wine_id");
  CREATE INDEX IF NOT EXISTS "user_wines_list_idx" ON "user_wines" USING btree ("list_id");
  CREATE INDEX IF NOT EXISTS "user_wines_updated_at_idx" ON "user_wines" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "user_wines_created_at_idx" ON "user_wines" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "transactions_transaction_id_idx" ON "transactions" USING btree ("transaction_id");
  CREATE INDEX IF NOT EXISTS "transactions_user_idx" ON "transactions" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "transactions_related_course_idx" ON "transactions" USING btree ("related_course_id");
  CREATE INDEX IF NOT EXISTS "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "subscriptions_features_order_idx" ON "subscriptions_features" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "subscriptions_features_parent_id_idx" ON "subscriptions_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_subscription_number_idx" ON "subscriptions" USING btree ("subscription_number");
  CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");
  CREATE INDEX IF NOT EXISTS "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "subscriptions_rels_order_idx" ON "subscriptions_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "subscriptions_rels_parent_idx" ON "subscriptions_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "subscriptions_rels_path_idx" ON "subscriptions_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "subscriptions_rels_vinprovningar_id_idx" ON "subscriptions_rels" USING btree ("vinprovningar_id");
  CREATE INDEX IF NOT EXISTS "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "orders_items_course_idx" ON "orders_items" USING btree ("course_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX IF NOT EXISTS "orders_user_idx" ON "orders" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "grapes_name_idx" ON "grapes" USING btree ("name");
  CREATE INDEX IF NOT EXISTS "grapes_created_by_idx" ON "grapes" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "grapes_updated_by_idx" ON "grapes" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "grapes_updated_at_idx" ON "grapes" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "grapes_created_at_idx" ON "grapes" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "countries_name_idx" ON "countries" USING btree ("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "countries_slug_idx" ON "countries" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "countries_created_by_idx" ON "countries" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "countries_updated_by_idx" ON "countries" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "countries_seo_image_idx" ON "countries" USING btree ("seo_image_id");
  CREATE INDEX IF NOT EXISTS "countries_updated_at_idx" ON "countries" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "countries_created_at_idx" ON "countries" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "regions_name_idx" ON "regions" USING btree ("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "regions_slug_idx" ON "regions" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "regions_country_idx" ON "regions" USING btree ("country_id");
  CREATE INDEX IF NOT EXISTS "regions_created_by_idx" ON "regions" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "regions_updated_by_idx" ON "regions" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "regions_seo_image_idx" ON "regions" USING btree ("seo_image_id");
  CREATE INDEX IF NOT EXISTS "regions_updated_at_idx" ON "regions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "regions_created_at_idx" ON "regions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "user_wine_lists_user_idx" ON "user_wine_lists" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "user_wine_lists_created_by_idx" ON "user_wine_lists" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "user_wine_lists_updated_by_idx" ON "user_wine_lists" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "user_wine_lists_updated_at_idx" ON "user_wine_lists" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "user_wine_lists_created_at_idx" ON "user_wine_lists" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_primary_aromas_order_idx" ON "reviews_wset_tasting_nose_primary_aromas" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_primary_aromas_parent_idx" ON "reviews_wset_tasting_nose_primary_aromas" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_secondary_aromas_order_idx" ON "reviews_wset_tasting_nose_secondary_aromas" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_secondary_aromas_parent_idx" ON "reviews_wset_tasting_nose_secondary_aromas" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_tertiary_aromas_order_idx" ON "reviews_wset_tasting_nose_tertiary_aromas" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_nose_tertiary_aromas_parent_idx" ON "reviews_wset_tasting_nose_tertiary_aromas" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_primary_flavours_order_idx" ON "reviews_wset_tasting_palate_primary_flavours" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_primary_flavours_parent_idx" ON "reviews_wset_tasting_palate_primary_flavours" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_secondary_flavours_order_idx" ON "reviews_wset_tasting_palate_secondary_flavours" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_secondary_flavours_parent_idx" ON "reviews_wset_tasting_palate_secondary_flavours" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_tertiary_flavours_order_idx" ON "reviews_wset_tasting_palate_tertiary_flavours" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "reviews_wset_tasting_palate_tertiary_flavours_parent_idx" ON "reviews_wset_tasting_palate_tertiary_flavours" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "reviews_wine_idx" ON "reviews" USING btree ("wine_id");
  CREATE INDEX IF NOT EXISTS "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "reviews_session_participant_idx" ON "reviews" USING btree ("session_participant_id");
  CREATE INDEX IF NOT EXISTS "reviews_session_idx" ON "reviews" USING btree ("session_id");
  CREATE INDEX IF NOT EXISTS "reviews_created_by_idx" ON "reviews" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "reviews_updated_by_idx" ON "reviews" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "course_reviews_course_idx" ON "course_reviews" USING btree ("course_id");
  CREATE INDEX IF NOT EXISTS "course_reviews_author_idx" ON "course_reviews" USING btree ("author_id");
  CREATE INDEX IF NOT EXISTS "course_reviews_review_token_idx" ON "course_reviews" USING btree ("review_token");
  CREATE INDEX IF NOT EXISTS "course_reviews_updated_at_idx" ON "course_reviews" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "course_reviews_created_at_idx" ON "course_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "blog_posts_featured_image_idx" ON "blog_posts" USING btree ("featured_image_id");
  CREATE INDEX IF NOT EXISTS "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");
  CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" USING btree ("category_id");
  CREATE INDEX IF NOT EXISTS "blog_posts_seo_image_idx" ON "blog_posts" USING btree ("seo_image_id");
  CREATE INDEX IF NOT EXISTS "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blog_posts__status_idx" ON "blog_posts" USING btree ("_status");
  CREATE INDEX IF NOT EXISTS "blog_posts_rels_order_idx" ON "blog_posts_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "blog_posts_rels_parent_idx" ON "blog_posts_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "blog_posts_rels_path_idx" ON "blog_posts_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "blog_posts_rels_blog_tags_id_idx" ON "blog_posts_rels" USING btree ("blog_tags_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_parent_idx" ON "_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_slug_idx" ON "_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_featured_image_idx" ON "_blog_posts_v" USING btree ("version_featured_image_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_author_idx" ON "_blog_posts_v" USING btree ("version_author_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_category_idx" ON "_blog_posts_v" USING btree ("version_category_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_seo_image_idx" ON "_blog_posts_v" USING btree ("version_seo_image_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_updated_at_idx" ON "_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version_created_at_idx" ON "_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_version_version__status_idx" ON "_blog_posts_v" USING btree ("version__status");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_created_at_idx" ON "_blog_posts_v" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_updated_at_idx" ON "_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_latest_idx" ON "_blog_posts_v" USING btree ("latest");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_autosave_idx" ON "_blog_posts_v" USING btree ("autosave");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_rels_order_idx" ON "_blog_posts_v_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_rels_parent_idx" ON "_blog_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_rels_path_idx" ON "_blog_posts_v_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "_blog_posts_v_rels_blog_tags_id_idx" ON "_blog_posts_v_rels" USING btree ("blog_tags_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_name_idx" ON "blog_categories" USING btree ("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_idx" ON "blog_categories" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "blog_categories_created_by_idx" ON "blog_categories" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "blog_categories_updated_by_idx" ON "blog_categories" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "blog_categories_updated_at_idx" ON "blog_categories" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_categories_created_at_idx" ON "blog_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_name_idx" ON "blog_tags" USING btree ("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_slug_idx" ON "blog_tags" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "blog_tags_created_by_idx" ON "blog_tags" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "blog_tags_updated_by_idx" ON "blog_tags" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "blog_tags_updated_at_idx" ON "blog_tags" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_tags_created_at_idx" ON "blog_tags" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "course_sessions_course_idx" ON "course_sessions" USING btree ("course_id");
  CREATE INDEX IF NOT EXISTS "course_sessions_current_lesson_idx" ON "course_sessions" USING btree ("current_lesson_id");
  CREATE INDEX IF NOT EXISTS "course_sessions_current_quiz_idx" ON "course_sessions" USING btree ("current_quiz_id");
  CREATE INDEX IF NOT EXISTS "course_sessions_host_idx" ON "course_sessions" USING btree ("host_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "course_sessions_join_code_idx" ON "course_sessions" USING btree ("join_code");
  CREATE INDEX IF NOT EXISTS "course_sessions_updated_at_idx" ON "course_sessions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "course_sessions_created_at_idx" ON "course_sessions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "session_participants_session_idx" ON "session_participants" USING btree ("session_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "session_participants_participant_token_idx" ON "session_participants" USING btree ("participant_token");
  CREATE INDEX IF NOT EXISTS "session_participants_user_idx" ON "session_participants" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "session_participants_updated_at_idx" ON "session_participants" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "session_participants_created_at_idx" ON "session_participants" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vinprovningar_id_idx" ON "payload_locked_documents_rels" USING btree ("vinprovningar_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_modules_id_idx" ON "payload_locked_documents_rels" USING btree ("modules_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_content_items_id_idx" ON "payload_locked_documents_rels" USING btree ("content_items_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_user_progress_id_idx" ON "payload_locked_documents_rels" USING btree ("user_progress_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("questions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_quiz_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_attempts_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_enrollments_id_idx" ON "payload_locked_documents_rels" USING btree ("enrollments_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_wines_id_idx" ON "payload_locked_documents_rels" USING btree ("wines_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_user_wines_id_idx" ON "payload_locked_documents_rels" USING btree ("user_wines_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_grapes_id_idx" ON "payload_locked_documents_rels" USING btree ("grapes_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_countries_id_idx" ON "payload_locked_documents_rels" USING btree ("countries_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_regions_id_idx" ON "payload_locked_documents_rels" USING btree ("regions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_user_wine_lists_id_idx" ON "payload_locked_documents_rels" USING btree ("user_wine_lists_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_course_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("course_reviews_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_categories_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_tags_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_course_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("course_sessions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_session_participants_id_idx" ON "payload_locked_documents_rels" USING btree ("session_participants_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "media" CASCADE;
  DROP TABLE "users_wine_preferences_preferred_styles" CASCADE;
  DROP TABLE "users_wine_preferences_discovery_preferences" CASCADE;
  DROP TABLE "users_course_progress" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "vinprovningar_modules" CASCADE;
  DROP TABLE "vinprovningar_tags" CASCADE;
  DROP TABLE "vinprovningar" CASCADE;
  DROP TABLE "_vinprovningar_v_version_modules" CASCADE;
  DROP TABLE "_vinprovningar_v_version_tags" CASCADE;
  DROP TABLE "_vinprovningar_v" CASCADE;
  DROP TABLE "modules_content_items" CASCADE;
  DROP TABLE "modules" CASCADE;
  DROP TABLE "content_items_questions" CASCADE;
  DROP TABLE "content_items" CASCADE;
  DROP TABLE "user_progress_scores" CASCADE;
  DROP TABLE "user_progress_quiz_scores" CASCADE;
  DROP TABLE "user_progress_lesson_states" CASCADE;
  DROP TABLE "user_progress_notes" CASCADE;
  DROP TABLE "user_progress" CASCADE;
  DROP TABLE "user_progress_rels" CASCADE;
  DROP TABLE "questions_options" CASCADE;
  DROP TABLE "questions_acceptable_answers" CASCADE;
  DROP TABLE "questions" CASCADE;
  DROP TABLE "quiz_attempts_answers" CASCADE;
  DROP TABLE "quiz_attempts" CASCADE;
  DROP TABLE "enrollments_restrictions_allowed_ip_addresses" CASCADE;
  DROP TABLE "enrollments" CASCADE;
  DROP TABLE "wines_food_pairings" CASCADE;
  DROP TABLE "wines" CASCADE;
  DROP TABLE "wines_rels" CASCADE;
  DROP TABLE "user_wines_tags" CASCADE;
  DROP TABLE "user_wines" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "subscriptions_features" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "subscriptions_rels" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "grapes" CASCADE;
  DROP TABLE "countries" CASCADE;
  DROP TABLE "regions" CASCADE;
  DROP TABLE "user_wine_lists" CASCADE;
  DROP TABLE "reviews_wset_tasting_nose_primary_aromas" CASCADE;
  DROP TABLE "reviews_wset_tasting_nose_secondary_aromas" CASCADE;
  DROP TABLE "reviews_wset_tasting_nose_tertiary_aromas" CASCADE;
  DROP TABLE "reviews_wset_tasting_palate_primary_flavours" CASCADE;
  DROP TABLE "reviews_wset_tasting_palate_secondary_flavours" CASCADE;
  DROP TABLE "reviews_wset_tasting_palate_tertiary_flavours" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "course_reviews" CASCADE;
  DROP TABLE "blog_posts" CASCADE;
  DROP TABLE "blog_posts_rels" CASCADE;
  DROP TABLE "_blog_posts_v" CASCADE;
  DROP TABLE "_blog_posts_v_rels" CASCADE;
  DROP TABLE "blog_categories" CASCADE;
  DROP TABLE "blog_tags" CASCADE;
  DROP TABLE "course_sessions" CASCADE;
  DROP TABLE "session_participants" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_wine_preferences_preferred_styles";
  DROP TYPE "public"."enum_users_wine_preferences_discovery_preferences";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_account_status";
  DROP TYPE "public"."enum_users_subscription_status";
  DROP TYPE "public"."enum_users_subscription_plan";
  DROP TYPE "public"."enum_users_onboarding_goal";
  DROP TYPE "public"."enum_users_onboarding_source";
  DROP TYPE "public"."enum_users_wine_preferences_tasting_experience";
  DROP TYPE "public"."enum_users_wine_preferences_price_range";
  DROP TYPE "public"."enum_vinprovningar_preview_video_provider";
  DROP TYPE "public"."enum_vinprovningar_preview_mux_data_status";
  DROP TYPE "public"."enum_vinprovningar_level";
  DROP TYPE "public"."enum_vinprovningar_status";
  DROP TYPE "public"."enum__vinprovningar_v_version_preview_video_provider";
  DROP TYPE "public"."enum__vinprovningar_v_version_preview_mux_data_status";
  DROP TYPE "public"."enum__vinprovningar_v_version_level";
  DROP TYPE "public"."enum__vinprovningar_v_version_status";
  DROP TYPE "public"."enum_content_items_content_type";
  DROP TYPE "public"."enum_content_items_video_provider";
  DROP TYPE "public"."enum_content_items_mux_data_status";
  DROP TYPE "public"."enum_content_items_lesson_type";
  DROP TYPE "public"."enum_content_items_quiz_settings_show_correct_answers";
  DROP TYPE "public"."enum_content_items_status";
  DROP TYPE "public"."enum_user_progress_status";
  DROP TYPE "public"."enum_questions_type";
  DROP TYPE "public"."enum_questions_correct_answer_true_false";
  DROP TYPE "public"."enum_quiz_attempts_status";
  DROP TYPE "public"."enum_quiz_attempts_scoring_grade";
  DROP TYPE "public"."enum_quiz_attempts_metadata_device_type";
  DROP TYPE "public"."enum_enrollments_status";
  DROP TYPE "public"."enum_enrollments_enrollment_type";
  DROP TYPE "public"."enum_enrollments_access_level";
  DROP TYPE "public"."enum_enrollments_payment_payment_status";
  DROP TYPE "public"."enum_enrollments_metadata_enrollment_reason";
  DROP TYPE "public"."enum_transactions_type";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_transactions_payment_method";
  DROP TYPE "public"."enum_transactions_currency";
  DROP TYPE "public"."enum_transactions_payment_processor_processor";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_plan_id";
  DROP TYPE "public"."enum_subscriptions_interval";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_method";
  DROP TYPE "public"."enum_grapes_color";
  DROP TYPE "public"."enum_reviews_wset_tasting_nose_primary_aromas";
  DROP TYPE "public"."enum_reviews_wset_tasting_nose_secondary_aromas";
  DROP TYPE "public"."enum_reviews_wset_tasting_nose_tertiary_aromas";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_primary_flavours";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_secondary_flavours";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_tertiary_flavours";
  DROP TYPE "public"."enum_reviews_wset_tasting_appearance_clarity";
  DROP TYPE "public"."enum_reviews_wset_tasting_appearance_intensity";
  DROP TYPE "public"."enum_reviews_wset_tasting_appearance_color";
  DROP TYPE "public"."enum_reviews_wset_tasting_nose_intensity";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_sweetness";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_acidity";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_tannin";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_alcohol";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_body";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_flavour_intensity";
  DROP TYPE "public"."enum_reviews_wset_tasting_palate_finish";
  DROP TYPE "public"."enum_reviews_wset_tasting_conclusion_quality";
  DROP TYPE "public"."enum_course_reviews_status";
  DROP TYPE "public"."enum_blog_posts_status";
  DROP TYPE "public"."enum__blog_posts_v_version_status";
  DROP TYPE "public"."enum_blog_categories_color";
  DROP TYPE "public"."enum_blog_tags_type";
  DROP TYPE "public"."enum_blog_tags_color";
  DROP TYPE "public"."enum_course_sessions_status";
  DROP TYPE "public"."enum_course_sessions_current_activity";`)
}
