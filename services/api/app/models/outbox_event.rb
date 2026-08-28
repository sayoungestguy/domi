class OutboxEvent < ApplicationRecord
  EVENT_TYPES = %w[household.changed].freeze

  belongs_to :household

  validates :sequence, numericality: { only_integer: true, greater_than: 0 },
    uniqueness: { scope: :household_id }
  validates :event_type, inclusion: { in: EVENT_TYPES }
  validates :subject_type, :subject_id, :occurred_at, :available_at, presence: true
  validates :attempts, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :pending, -> { where(published_at: nil).where("available_at <= ?", Time.current) }

  after_create_commit -> { Outbox::PublishEventJob.perform_later(id) }

  def published?
    published_at.present?
  end
end
