class ShoppingEntry < ApplicationRecord
  belongs_to :shopping_list
  belongs_to :inventory_item, optional: true
  belongs_to :added_by, class_name: "User"
  belongs_to :updated_by, class_name: "User"
  has_one :shopping_trip_item, foreign_key: :source_entry_id, dependent: :restrict_with_error,
    inverse_of: :source_entry

  normalizes :name, with: ->(name) { name.strip }
  normalizes :note, with: ->(note) { note.strip.presence }

  validates :name, presence: true, length: { maximum: 120 }
  validates :quantity, numericality: {
    greater_than_or_equal_to: 0,
    less_than: 1_000_000_000
  }, allow_nil: true
  validates :note, length: { maximum: 1_000 }, allow_nil: true
  validates :idempotency_key, presence: true, length: { minimum: 8, maximum: 255 },
    uniqueness: { scope: :shopping_list_id }
  validate :inventory_item_belongs_to_household

  scope :active, -> { where(removed_at: nil) }
  scope :remaining, -> { active.where(purchased: false) }
  scope :purchased, -> { active.where(purchased: true) }

  def household
    shopping_list.household
  end

  private

  def inventory_item_belongs_to_household
    return if inventory_item.nil? || inventory_item.household_id == shopping_list&.household_id

    errors.add(:inventory_item, "must belong to the same household")
  end
end
