class CreatePhaseFourShoppingTrips < ActiveRecord::Migration[8.1]
  def change
    create_table :shopping_trips, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :shopping_list, null: false, type: :uuid, foreign_key: true
      t.references :completed_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.string :idempotency_key, null: false, limit: 255
      t.boolean :restock_inventory_items, null: false, default: false
      t.integer :purchased_count, null: false
      t.integer :restocked_count, null: false, default: 0
      t.datetime :completed_at, null: false
      t.timestamps
    end
    add_check_constraint :shopping_trips, "purchased_count > 0",
      name: "shopping_trip_purchased_count_positive"
    add_check_constraint :shopping_trips, "restocked_count >= 0 AND restocked_count <= purchased_count",
      name: "shopping_trip_restocked_count_valid"
    add_index :shopping_trips, [ :shopping_list_id, :idempotency_key ], unique: true,
      name: "index_shopping_trips_on_list_and_idempotency"
    add_index :shopping_trips, [ :household_id, :completed_at ],
      name: "index_shopping_trips_on_household_and_completed_at"

    create_table :shopping_trip_items, id: :uuid do |t|
      t.references :shopping_trip, null: false, type: :uuid, foreign_key: true
      t.references :source_entry, null: false, type: :uuid,
        foreign_key: { to_table: :shopping_entries }, index: { unique: true }
      t.references :inventory_item, type: :uuid, foreign_key: true
      t.citext :name, null: false
      t.decimal :quantity, precision: 12, scale: 3
      t.text :note
      t.datetime :checked_at, null: false
      t.boolean :restocked, null: false, default: false
      t.timestamps
    end
    add_check_constraint :shopping_trip_items, "quantity IS NULL OR quantity >= 0",
      name: "shopping_trip_item_quantity_nonnegative"
  end
end
