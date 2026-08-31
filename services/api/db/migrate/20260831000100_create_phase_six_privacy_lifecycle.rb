class CreatePhaseSixPrivacyLifecycle < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :deleted_at, :datetime
    add_index :users, :deleted_at

    create_table :privacy_audit_events, id: :uuid do |t|
      t.string :action, null: false, limit: 100
      t.uuid :actor_id
      t.string :subject_type, null: false, limit: 100
      t.uuid :subject_id, null: false
      t.string :request_id, limit: 255
      t.jsonb :metadata, null: false, default: {}
      t.datetime :created_at, null: false
    end
    add_index :privacy_audit_events, %i[action created_at]
    add_index :privacy_audit_events, %i[subject_type subject_id]
  end
end
