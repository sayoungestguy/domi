class InventoryItem < ApplicationRecord
  STATUSES = %w[ok low out].freeze

  belongs_to :household
  belongs_to :category, optional: true
  belongs_to :created_by, class_name: "User"
  belongs_to :updated_by, class_name: "User"
  has_many :shopping_entries, dependent: :restrict_with_error
  has_many :shopping_trip_items, dependent: :restrict_with_error

  normalizes :name, with: ->(name) { name.strip }
  normalizes :unit, with: ->(unit) { unit.strip.presence }
  normalizes :notes, with: ->(notes) { notes.strip.presence }

  validates :name, presence: true, length: { maximum: 120 }
  validates :status, inclusion: { in: STATUSES }
  validates :quantity, numericality: {
    greater_than_or_equal_to: 0,
    less_than: 1_000_000_000
  }, allow_nil: true
  validates :unit, length: { maximum: 40 }, allow_nil: true
  validates :notes, length: { maximum: 2_000 }, allow_nil: true
  validate :category_belongs_to_household

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :attention, -> { active.where(status: %w[low out]) }

  private

  def category_belongs_to_household
    return if category.nil? || category.household_id == household_id

    errors.add(:category, "must belong to the same household")
  end
end
