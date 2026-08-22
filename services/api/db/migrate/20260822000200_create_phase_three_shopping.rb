class CreatePhaseThreeShopping < ActiveRecord::Migration[8.1]
  def change
    create_table :shopping_lists, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true, index: { unique: true }
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end

    create_table :household_preferences, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true, index: { unique: true }
      t.boolean :auto_add_out_items, null: false, default: false
      t.timestamps
    end

    create_table :shopping_entries, id: :uuid do |t|
      t.references :shopping_list, null: false, type: :uuid, foreign_key: true
      t.references :inventory_item, type: :uuid, foreign_key: true
      t.references :added_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.references :updated_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.citext :name, null: false
      t.decimal :quantity, precision: 12, scale: 3
      t.text :note
      t.boolean :purchased, null: false, default: false
      t.datetime :checked_at
      t.datetime :removed_at
      t.string :idempotency_key, null: false, limit: 255
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_check_constraint :shopping_entries, "quantity IS NULL OR quantity >= 0",
      name: "shopping_entry_quantity_nonnegative"
    add_index :shopping_entries, [ :shopping_list_id, :idempotency_key ], unique: true,
      name: "index_shopping_entries_on_list_and_idempotency"
    add_index :shopping_entries, [ :shopping_list_id, :inventory_item_id ], unique: true,
      where: "inventory_item_id IS NOT NULL AND removed_at IS NULL",
      name: "index_shopping_entries_on_active_linked_item"
    add_index :shopping_entries, [ :shopping_list_id, :removed_at, :purchased, :created_at ],
      name: "index_shopping_entries_on_active_list"
  end
end
