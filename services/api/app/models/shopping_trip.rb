class ShoppingTrip < ApplicationRecord
  belongs_to :household
  belongs_to :shopping_list
  belongs_to :completed_by, class_name: "User"
  has_many :shopping_trip_items, dependent: :delete_all

  validates :idempotency_key, presence: true, length: { minimum: 8, maximum: 255 },
    uniqueness: { scope: :shopping_list_id }
  validates :purchased_count, numericality: { only_integer: true, greater_than: 0 }
  validates :restocked_count, numericality: {
    only_integer: true,
    greater_than_or_equal_to: 0,
    less_than_or_equal_to: :purchased_count
  }
  validates :completed_at, presence: true
  validate :list_belongs_to_household

  def readonly?
    persisted?
  end

  private

  def list_belongs_to_household
    return if shopping_list.nil? || shopping_list.household_id == household_id

    errors.add(:shopping_list, "must belong to the same household")
  end
end
