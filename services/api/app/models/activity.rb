class Activity < ApplicationRecord
  INVENTORY_ACTIONS = %w[
    inventory.item_created
    inventory.item_updated
    inventory.status_changed
    inventory.item_archived
    inventory.item_restored
  ].freeze

  belongs_to :household
  belongs_to :actor, class_name: "User"

  validates :action, inclusion: { in: INVENTORY_ACTIONS }
  validates :subject_type, :subject_id, presence: true

  def readonly?
    persisted?
  end
end
