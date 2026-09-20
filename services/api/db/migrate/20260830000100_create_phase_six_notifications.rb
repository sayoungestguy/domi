class CreatePhaseSixNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_preferences, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :user, null: false, type: :uuid, foreign_key: true
      t.boolean :member_joined, null: false, default: true
      t.boolean :shopping_entry_added, null: false, default: true
      t.boolean :shopping_trip_completed, null: false, default: true
      t.timestamps
    end
    add_index :notification_preferences, %i[household_id user_id], unique: true

    create_table :notifications, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :recipient, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.references :actor, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.string :kind, null: false, limit: 80
      t.string :title, null: false, limit: 120
      t.string :body, null: false, limit: 500
      t.string :subject_type, null: false, limit: 120
      t.uuid :subject_id, null: false
      t.datetime :read_at
      t.timestamps
    end
    add_index :notifications, %i[recipient_id created_at]
    add_index :notifications, %i[household_id recipient_id kind subject_type subject_id],
      unique: true, name: "index_notifications_on_delivery_identity"
    add_check_constraint :notifications,
      "kind IN ('member_joined', 'shopping_entry_added', 'shopping_trip_completed')",
      name: "notification_kind"
  end
end
