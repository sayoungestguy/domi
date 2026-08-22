class ShoppingList < ApplicationRecord
  belongs_to :household
  has_many :shopping_entries, dependent: :destroy

  validates :household_id, uniqueness: true
end
