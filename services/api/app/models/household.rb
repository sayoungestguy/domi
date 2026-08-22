class Household < ApplicationRecord
  has_many :household_memberships, dependent: :destroy
  has_many :members, through: :household_memberships, source: :user
  has_many :household_invitations, dependent: :destroy
  has_many :categories, dependent: :destroy
  has_many :inventory_items, dependent: :destroy
  has_many :activities, dependent: :destroy
  has_one :shopping_list, dependent: :destroy
  has_one :household_preference, dependent: :destroy

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true, length: { maximum: 100 }
  validates :timezone, presence: true, inclusion: { in: TZInfo::Timezone.all_identifiers }

  def owner_membership
    household_memberships.find_by(role: "owner")
  end
end
