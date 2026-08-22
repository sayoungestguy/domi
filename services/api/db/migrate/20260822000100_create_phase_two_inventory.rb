class CreatePhaseTwoInventory < ActiveRecord::Migration[8.1]
  def change
    create_table :categories, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.citext :name, null: false
      t.integer :position, null: false, default: 0
      t.datetime :archived_at
      t.timestamps
    end
    add_index :categories, [ :household_id, :name ], unique: true,
      where: "archived_at IS NULL", name: "index_categories_on_household_and_active_name"
    add_index :categories, [ :household_id, :position ]

    create_table :inventory_items, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :category, type: :uuid, foreign_key: true
      t.references :created_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.references :updated_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.citext :name, null: false
      t.string :status, null: false, default: "ok"
      t.decimal :quantity, precision: 12, scale: 3
      t.string :unit, limit: 40
      t.text :notes
      t.datetime :archived_at
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_check_constraint :inventory_items, "status IN ('ok', 'low', 'out')",
      name: "inventory_item_status"
    add_check_constraint :inventory_items, "quantity IS NULL OR quantity >= 0",
      name: "inventory_item_quantity_nonnegative"
    add_index :inventory_items, [ :household_id, :archived_at, :status, :updated_at ],
      name: "index_inventory_items_on_household_filter"
    add_index :inventory_items, [ :household_id, :name ],
      name: "index_inventory_items_on_household_and_name"

    create_table :activities, id: :uuid do |t|
      t.references :household, null: false, type: :uuid, foreign_key: true
      t.references :actor, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.string :action, null: false
      t.string :subject_type, null: false
      t.uuid :subject_id, null: false
      t.jsonb :metadata, null: false, default: {}
      t.datetime :created_at, null: false
    end
    add_index :activities, [ :household_id, :created_at ], order: { created_at: :desc }
    add_index :activities, [ :subject_type, :subject_id ]
  end
end
