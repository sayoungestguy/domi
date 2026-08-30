class Notification < ApplicationRecord
  KINDS = %w[member_joined shopping_entry_added shopping_trip_completed].freeze

  belongs_to :household
  belongs_to :recipient, class_name: "User"
  belongs_to :actor, class_name: "User"

  validates :kind, inclusion: { in: KINDS }
  validates :title, presence: true, length: { maximum: 120 }
  validates :body, presence: true, length: { maximum: 500 }
  validates :subject_type, :subject_id, presence: true

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }
  scope :unread, -> { where(read_at: nil) }
end
