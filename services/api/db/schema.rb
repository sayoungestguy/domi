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

ActiveRecord::Schema[8.1].define(version: 2026_08_20_000100) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

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

  create_table "households", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "lock_version", default: 0, null: false
    t.string "name", null: false
    t.string "timezone", default: "Etc/UTC", null: false
    t.datetime "updated_at", null: false
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

  add_foreign_key "auth_sessions", "users"
  add_foreign_key "household_invitations", "households"
  add_foreign_key "household_invitations", "users", column: "accepted_by_id"
  add_foreign_key "household_invitations", "users", column: "created_by_id"
  add_foreign_key "household_memberships", "households"
  add_foreign_key "household_memberships", "users"
end
