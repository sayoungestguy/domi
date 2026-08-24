class ShoppingList < ApplicationRecord
  belongs_to :household
  has_many :shopping_entries, dependent: :destroy
  has_many :shopping_trips, dependent: :delete_all

  validates :household_id, uniqueness: true
end
