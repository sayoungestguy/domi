class Activity < ApplicationRecord
  ACTIONS = %w[
    inventory.item_created
    inventory.item_updated
    inventory.status_changed
    inventory.item_archived
    inventory.item_restored
    shopping.entry_added
    shopping.entry_updated
    shopping.entry_checked
    shopping.entry_unchecked
    shopping.entry_removed
    shopping.preference_updated
  ].freeze

  belongs_to :household
  belongs_to :actor, class_name: "User"

  validates :action, inclusion: { in: ACTIONS }
  validates :subject_type, :subject_id, presence: true

  def readonly?
    persisted?
  end
end
