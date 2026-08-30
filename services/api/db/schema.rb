# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_30_000100) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "activities", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "action", null: false
    t.uuid "actor_id", null: false
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.jsonb "metadata", default: {}, null: false
    t.uuid "subject_id", null: false
    t.string "subject_type", null: false
    t.index ["actor_id"], name: "index_activities_on_actor_id"
    t.index ["household_id", "created_at"], name: "index_activities_on_household_id_and_created_at", order: { created_at: :desc }
    t.index ["household_id"], name: "index_activities_on_household_id"
    t.index ["subject_type", "subject_id"], name: "index_activities_on_subject_type_and_subject_id"
  end

  create_table "auth_sessions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "access_expires_at", null: false
    t.string "access_token_digest", null: false
    t.datetime "created_at", null: false
    t.inet "ip_address"
    t.datetime "last_used_at"
    t.datetime "refresh_expires_at", null: false
    t.string "refresh_token_digest", null: false
    t.datetime "revoked_at"
    t.uuid "token_family_id", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent", limit: 512
    t.uuid "user_id", null: false
    t.index ["access_token_digest"], name: "index_auth_sessions_on_access_token_digest", unique: true
    t.index ["refresh_token_digest"], name: "index_auth_sessions_on_refresh_token_digest", unique: true
    t.index ["token_family_id"], name: "index_auth_sessions_on_token_family_id"
    t.index ["user_id", "revoked_at"], name: "index_auth_sessions_on_user_id_and_revoked_at"
    t.index ["user_id"], name: "index_auth_sessions_on_user_id"
  end

  create_table "categories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.citext "name", null: false
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["household_id", "name"], name: "index_categories_on_household_and_active_name", unique: true, where: "(archived_at IS NULL)"
    t.index ["household_id", "position"], name: "index_categories_on_household_id_and_position"
    t.index ["household_id"], name: "index_categories_on_household_id"
  end

  create_table "household_invitations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "accepted_at"
    t.uuid "accepted_by_id"
    t.datetime "created_at", null: false
    t.uuid "created_by_id", null: false
    t.datetime "expires_at", null: false
    t.uuid "household_id", null: false
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["accepted_by_id"], name: "index_household_invitations_on_accepted_by_id"
    t.index ["created_by_id"], name: "index_household_invitations_on_created_by_id"
    t.index ["household_id", "expires_at"], name: "index_household_invitations_on_household_id_and_expires_at"
    t.index ["household_id"], name: "index_household_invitations_on_household_id"
    t.index ["token_digest"], name: "index_household_invitations_on_token_digest", unique: true
  end

  create_table "household_memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["household_id", "user_id"], name: "index_household_memberships_on_household_and_user", unique: true
    t.index ["household_id"], name: "index_household_memberships_on_household_id"
    t.index ["household_id"], name: "index_households_on_single_owner", unique: true, where: "((role)::text = 'owner'::text)"
    t.index ["user_id"], name: "index_household_memberships_on_user_id"
    t.check_constraint "role::text = ANY (ARRAY['owner'::character varying::text, 'member'::character varying::text])", name: "household_membership_role"
  end

  create_table "household_preferences", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "auto_add_out_items", default: false, null: false
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_household_preferences_on_household_id", unique: true
  end

  create_table "households", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "lock_version", default: 0, null: false
    t.string "name", null: false
    t.bigint "realtime_sequence", default: 0, null: false
    t.string "timezone", default: "Etc/UTC", null: false
    t.datetime "updated_at", null: false
    t.check_constraint "realtime_sequence >= 0", name: "household_realtime_sequence_nonnegative"
  end

  create_table "inventory_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "archived_at"
    t.uuid "category_id"
    t.datetime "created_at", null: false
    t.uuid "created_by_id", null: false
    t.uuid "household_id", null: false
    t.integer "lock_version", default: 0, null: false
    t.citext "name", null: false
    t.text "notes"
    t.decimal "quantity", precision: 12, scale: 3
    t.string "status", default: "ok", null: false
    t.string "unit", limit: 40
    t.datetime "updated_at", null: false
    t.uuid "updated_by_id", null: false
    t.index ["category_id"], name: "index_inventory_items_on_category_id"
    t.index ["created_by_id"], name: "index_inventory_items_on_created_by_id"
    t.index ["household_id", "archived_at", "status", "updated_at"], name: "index_inventory_items_on_household_filter"
    t.index ["household_id", "name"], name: "index_inventory_items_on_household_and_name"
    t.index ["household_id"], name: "index_inventory_items_on_household_id"
    t.index ["updated_by_id"], name: "index_inventory_items_on_updated_by_id"
    t.check_constraint "quantity IS NULL OR quantity >= 0::numeric", name: "inventory_item_quantity_nonnegative"
    t.check_constraint "status::text = ANY (ARRAY['ok'::character varying::text, 'low'::character varying::text, 'out'::character varying::text])", name: "inventory_item_status"
  end

  create_table "notification_preferences", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.boolean "member_joined", default: true, null: false
    t.boolean "shopping_entry_added", default: true, null: false
    t.boolean "shopping_trip_completed", default: true, null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["household_id", "user_id"], name: "index_notification_preferences_on_household_id_and_user_id", unique: true
    t.index ["household_id"], name: "index_notification_preferences_on_household_id"
    t.index ["user_id"], name: "index_notification_preferences_on_user_id"
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "actor_id", null: false
    t.string "body", limit: 500, null: false
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.string "kind", limit: 80, null: false
    t.datetime "read_at"
    t.uuid "recipient_id", null: false
    t.uuid "subject_id", null: false
    t.string "subject_type", limit: 120, null: false
    t.string "title", limit: 120, null: false
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_notifications_on_actor_id"
    t.index ["household_id", "recipient_id", "kind", "subject_type", "subject_id"], name: "index_notifications_on_delivery_identity", unique: true
    t.index ["household_id"], name: "index_notifications_on_household_id"
    t.index ["recipient_id", "created_at"], name: "index_notifications_on_recipient_id_and_created_at"
    t.index ["recipient_id"], name: "index_notifications_on_recipient_id"
    t.check_constraint "kind::text = ANY (ARRAY['member_joined'::character varying, 'shopping_entry_added'::character varying, 'shopping_trip_completed'::character varying]::text[])", name: "notification_kind"
  end

  create_table "outbox_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.datetime "available_at", null: false
    t.datetime "created_at", null: false
    t.string "event_type", limit: 120, null: false
    t.uuid "household_id", null: false
    t.string "last_error", limit: 255
    t.datetime "occurred_at", null: false
    t.jsonb "payload", default: {}, null: false
    t.datetime "published_at"
    t.bigint "sequence", null: false
    t.uuid "subject_id", null: false
    t.string "subject_type", limit: 120, null: false
    t.datetime "updated_at", null: false
    t.index ["household_id", "sequence"], name: "index_outbox_events_on_household_id_and_sequence", unique: true
    t.index ["household_id"], name: "index_outbox_events_on_household_id"
    t.index ["published_at", "available_at", "created_at"], name: "index_outbox_events_for_dispatch"
    t.check_constraint "attempts >= 0", name: "outbox_event_attempts_nonnegative"
    t.check_constraint "sequence > 0", name: "outbox_event_sequence_positive"
  end

  create_table "shopping_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "added_by_id", null: false
    t.datetime "checked_at"
    t.datetime "created_at", null: false
    t.string "idempotency_key", limit: 255, null: false
    t.uuid "inventory_item_id"
    t.integer "lock_version", default: 0, null: false
    t.citext "name", null: false
    t.text "note"
    t.boolean "purchased", default: false, null: false
    t.decimal "quantity", precision: 12, scale: 3
    t.datetime "removed_at"
    t.uuid "shopping_list_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "updated_by_id", null: false
    t.index ["added_by_id"], name: "index_shopping_entries_on_added_by_id"
    t.index ["inventory_item_id"], name: "index_shopping_entries_on_inventory_item_id"
    t.index ["shopping_list_id", "idempotency_key"], name: "index_shopping_entries_on_list_and_idempotency", unique: true
    t.index ["shopping_list_id", "inventory_item_id"], name: "index_shopping_entries_on_active_linked_item", unique: true, where: "((inventory_item_id IS NOT NULL) AND (removed_at IS NULL))"
    t.index ["shopping_list_id", "removed_at", "purchased", "created_at"], name: "index_shopping_entries_on_active_list"
    t.index ["shopping_list_id"], name: "index_shopping_entries_on_shopping_list_id"
    t.index ["updated_by_id"], name: "index_shopping_entries_on_updated_by_id"
    t.check_constraint "quantity IS NULL OR quantity >= 0::numeric", name: "shopping_entry_quantity_nonnegative"
  end

  create_table "shopping_lists", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_shopping_lists_on_household_id", unique: true
  end

  create_table "shopping_trip_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "checked_at", null: false
    t.datetime "created_at", null: false
    t.uuid "inventory_item_id"
    t.citext "name", null: false
    t.text "note"
    t.decimal "quantity", precision: 12, scale: 3
    t.boolean "restocked", default: false, null: false
    t.uuid "shopping_trip_id", null: false
    t.uuid "source_entry_id", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_item_id"], name: "index_shopping_trip_items_on_inventory_item_id"
    t.index ["shopping_trip_id"], name: "index_shopping_trip_items_on_shopping_trip_id"
    t.index ["source_entry_id"], name: "index_shopping_trip_items_on_source_entry_id", unique: true
    t.check_constraint "quantity IS NULL OR quantity >= 0::numeric", name: "shopping_trip_item_quantity_nonnegative"
  end

  create_table "shopping_trips", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "completed_at", null: false
    t.uuid "completed_by_id", null: false
    t.datetime "created_at", null: false
    t.uuid "household_id", null: false
    t.string "idempotency_key", limit: 255, null: false
    t.integer "purchased_count", null: false
    t.boolean "restock_inventory_items", default: false, null: false
    t.integer "restocked_count", default: 0, null: false
    t.uuid "shopping_list_id", null: false
    t.datetime "updated_at", null: false
    t.index ["completed_by_id"], name: "index_shopping_trips_on_completed_by_id"
    t.index ["household_id", "completed_at"], name: "index_shopping_trips_on_household_and_completed_at"
    t.index ["household_id"], name: "index_shopping_trips_on_household_id"
    t.index ["shopping_list_id", "idempotency_key"], name: "index_shopping_trips_on_list_and_idempotency", unique: true
    t.index ["shopping_list_id"], name: "index_shopping_trips_on_shopping_list_id"
    t.check_constraint "purchased_count > 0", name: "shopping_trip_purchased_count_positive"
    t.check_constraint "restocked_count >= 0 AND restocked_count <= purchased_count", name: "shopping_trip_restocked_count_valid"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.citext "email", null: false
    t.datetime "email_verification_sent_at"
    t.string "email_verification_token_digest"
    t.datetime "email_verified_at"
    t.string "password_digest", null: false
    t.datetime "password_reset_sent_at"
    t.string "password_reset_token_digest"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["email_verification_token_digest"], name: "index_users_on_email_verification_token_digest", unique: true, where: "(email_verification_token_digest IS NOT NULL)"
    t.index ["password_reset_token_digest"], name: "index_users_on_password_reset_token_digest", unique: true, where: "(password_reset_token_digest IS NOT NULL)"
  end

  add_foreign_key "activities", "households"
  add_foreign_key "activities", "users", column: "actor_id"
  add_foreign_key "auth_sessions", "users"
  add_foreign_key "categories", "households"
  add_foreign_key "household_invitations", "households"
  add_foreign_key "household_invitations", "users", column: "accepted_by_id"
  add_foreign_key "household_invitations", "users", column: "created_by_id"
  add_foreign_key "household_memberships", "households"
  add_foreign_key "household_memberships", "users"
  add_foreign_key "household_preferences", "households"
  add_foreign_key "inventory_items", "categories"
  add_foreign_key "inventory_items", "households"
  add_foreign_key "inventory_items", "users", column: "created_by_id"
  add_foreign_key "inventory_items", "users", column: "updated_by_id"
  add_foreign_key "notification_preferences", "households"
  add_foreign_key "notification_preferences", "users"
  add_foreign_key "notifications", "households"
  add_foreign_key "notifications", "users", column: "actor_id"
  add_foreign_key "notifications", "users", column: "recipient_id"
  add_foreign_key "outbox_events", "households"
  add_foreign_key "shopping_entries", "inventory_items"
  add_foreign_key "shopping_entries", "shopping_lists"
  add_foreign_key "shopping_entries", "users", column: "added_by_id"
  add_foreign_key "shopping_entries", "users", column: "updated_by_id"
  add_foreign_key "shopping_lists", "households"
  add_foreign_key "shopping_trip_items", "inventory_items"
  add_foreign_key "shopping_trip_items", "shopping_entries", column: "source_entry_id"
  add_foreign_key "shopping_trip_items", "shopping_trips"
  add_foreign_key "shopping_trips", "households"
  add_foreign_key "shopping_trips", "shopping_lists"
  add_foreign_key "shopping_trips", "users", column: "completed_by_id"
end
