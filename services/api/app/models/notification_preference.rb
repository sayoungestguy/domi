class NotificationPreference < ApplicationRecord
  CATEGORY_COLUMNS = {
    "member_joined" => :member_joined,
    "shopping_entry_added" => :shopping_entry_added,
    "shopping_trip_completed" => :shopping_trip_completed
  }.freeze

  belongs_to :household
  belongs_to :user

  validates :user_id, uniqueness: { scope: :household_id }

  def enabled_for?(kind)
    public_send(CATEGORY_COLUMNS.fetch(kind))
  end
end
