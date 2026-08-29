class CreatePhaseFiveRealtime < ActiveRecord::Migration[8.1]
  def change
    add_column :households, :realtime_sequence, :bigint, null: false, default: 0
    add_check_constraint :households, "realtime_sequence >= 0",
      name: "household_realtime_sequence_nonnegative"

    create_table :outbox_events, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.bigint :sequence, null: false
      t.string :event_type, null: false, limit: 120
      t.string :subject_type, null: false, limit: 120
      t.uuid :subject_id, null: false
      t.jsonb :payload, null: false, default: {}
      t.datetime :occurred_at, null: false
      t.datetime :available_at, null: false
      t.datetime :published_at
      t.integer :attempts, null: false, default: 0
      t.string :last_error, limit: 255
      t.timestamps
    end
    add_check_constraint :outbox_events, "sequence > 0", name: "outbox_event_sequence_positive"
    add_check_constraint :outbox_events, "attempts >= 0", name: "outbox_event_attempts_nonnegative"
    add_index :outbox_events, [ :household_id, :sequence ], unique: true
    add_index :outbox_events, [ :published_at, :available_at, :created_at ],
      name: "index_outbox_events_for_dispatch"
  end
end
