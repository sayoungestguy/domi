class Category < ApplicationRecord
  belongs_to :household
  has_many :inventory_items, dependent: :nullify

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true, length: { maximum: 80 }, uniqueness: {
    scope: :household_id,
    conditions: -> { where(archived_at: nil) }
  }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :active, -> { where(archived_at: nil) }
end
