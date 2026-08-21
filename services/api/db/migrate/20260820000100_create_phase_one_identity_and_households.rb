class CreatePhaseOneIdentityAndHouseholds < ActiveRecord::Migration[8.1]
  def change
    enable_extension "citext"
    enable_extension "pgcrypto"

    create_table :users, id: :uuid do |t|
      t.citext :email, null: false
      t.string :display_name, null: false
      t.string :password_digest, null: false
      t.datetime :email_verified_at
      t.string :email_verification_token_digest
      t.datetime :email_verification_sent_at
      t.string :password_reset_token_digest
      t.datetime :password_reset_sent_at
      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :email_verification_token_digest, unique: true,
      where: "email_verification_token_digest IS NOT NULL"
    add_index :users, :password_reset_token_digest, unique: true,
      where: "password_reset_token_digest IS NOT NULL"

    create_table :auth_sessions, id: :uuid do |t|
      t.references :user, null: false, type: :uuid, foreign_key: true
      t.uuid :token_family_id, null: false
      t.string :access_token_digest, null: false
      t.string :refresh_token_digest, null: false
      t.datetime :access_expires_at, null: false
      t.datetime :refresh_expires_at, null: false
      t.datetime :revoked_at
      t.datetime :last_used_at
      t.string :user_agent, limit: 512
      t.inet :ip_address
      t.timestamps
    end
    add_index :auth_sessions, :access_token_digest, unique: true
    add_index :auth_sessions, :refresh_token_digest, unique: true
    add_index :auth_sessions, :token_family_id
    add_index :auth_sessions, [ :user_id, :revoked_at ]

    create_table :households, id: :uuid do |t|
      t.string :name, null: false
      t.string :timezone, null: false, default: "Etc/UTC"
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end

    create_table :household_memberships, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :user, null: false, type: :uuid, foreign_key: true
      t.string :role, null: false
      t.timestamps
    end
    add_index :household_memberships, [ :household_id, :user_id ], unique: true,
      name: "index_household_memberships_on_household_and_user"
    add_index :household_memberships, :household_id, unique: true,
      where: "role = 'owner'", name: "index_households_on_single_owner"
    add_check_constraint :household_memberships, "role IN ('owner', 'member')",
      name: "household_membership_role"

    create_table :household_invitations, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :created_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.references :accepted_by, type: :uuid, foreign_key: { to_table: :users }
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.datetime :accepted_at
      t.timestamps
    end
    add_index :household_invitations, :token_digest, unique: true
    add_index :household_invitations, [ :household_id, :expires_at ]
  end
end
