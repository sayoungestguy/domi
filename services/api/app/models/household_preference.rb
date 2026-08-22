class HouseholdPreference < ApplicationRecord
  belongs_to :household

  validates :household_id, uniqueness: true
  validates :auto_add_out_items, inclusion: { in: [ true, false ] }
end
