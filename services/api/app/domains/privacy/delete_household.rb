module Privacy
  class DeleteHousehold
    def self.call(household:, actor:)
      Household.transaction do
        household.lock!
        membership = household.household_memberships.lock.find_by(user: actor)
        owner_required! unless membership&.owner?

        Audit.call(
          action: "privacy.household_deleted", actor:,
          subject_type: "Household", subject_id: household.id,
          metadata: { memberCount: household.household_memberships.count }
        )
        delete_data(household)
      end
    end

    def self.delete_data(household)
      list_ids = ShoppingList.where(household:).pluck(:id)
      trip_ids = ShoppingTrip.where(household:).pluck(:id)
      ShoppingTripItem.where(shopping_trip_id: trip_ids).delete_all
      ShoppingTrip.where(id: trip_ids).delete_all
      ShoppingEntry.where(shopping_list_id: list_ids).delete_all
      ShoppingList.where(id: list_ids).delete_all
      InventoryItem.where(household:).delete_all
      Category.where(household:).delete_all
      Activity.where(household:).delete_all
      OutboxEvent.where(household:).delete_all
      Notification.where(household:).delete_all
      NotificationPreference.where(household:).delete_all
      HouseholdInvitation.where(household:).delete_all
      HouseholdPreference.where(household:).delete_all
      HouseholdMembership.where(household:).delete_all
      household.delete
    end
    private_class_method :delete_data

    def self.owner_required!
      raise DomainError.new(
        code: "privacy.owner_required",
        message: "Only the household owner can delete this household.",
        status: :forbidden
      )
    end
    private_class_method :owner_required!
  end
end
