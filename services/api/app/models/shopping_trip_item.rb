class ShoppingTripItem < ApplicationRecord
  belongs_to :shopping_trip
  belongs_to :source_entry, class_name: "ShoppingEntry"
  belongs_to :inventory_item, optional: true

  validates :name, presence: true, length: { maximum: 120 }
  validates :quantity, numericality: {
    greater_than_or_equal_to: 0,
    less_than: 1_000_000_000
  }, allow_nil: true
  validates :note, length: { maximum: 1_000 }, allow_nil: true
  validates :checked_at, presence: true
  validates :source_entry_id, uniqueness: true
  validate :references_belong_to_household

  def readonly?
    persisted?
  end

  private

  def references_belong_to_household
    household_id = shopping_trip&.household_id
    return if household_id.nil?

    if source_entry && source_entry.household.id != household_id
      errors.add(:source_entry, "must belong to the same household")
    end
    if inventory_item && inventory_item.household_id != household_id
      errors.add(:inventory_item, "must belong to the same household")
    end
  end
end
