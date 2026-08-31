module Privacy
  class ExportHousehold
    def self.call(household:, actor:)
      require_owner!(household, actor)
      payload = {
        schemaVersion: 1,
        exportedAt: Time.current.iso8601,
        household: household.slice(:id, :name, :timezone, :created_at),
        memberships: household.household_memberships.includes(:user).map do |membership|
          MembershipSerializer.render(membership)
        end,
        invitations: household.household_invitations.map do |invitation|
          invitation.slice(:id, :created_by_id, :accepted_by_id, :expires_at, :revoked_at, :accepted_at, :created_at)
        end,
        categories: household.categories.map { |category| CategorySerializer.render(category) },
        inventoryItems: household.inventory_items.includes(:category, :updated_by).map do |item|
          InventoryItemSerializer.render(item)
        end,
        shoppingEntries: shopping_entries(household).map do |entry|
          ShoppingEntrySerializer.render(entry)
        end,
        shoppingTrips: household.shopping_trips.includes(:completed_by, :shopping_trip_items).map do |trip|
          ShoppingTripSerializer.render(trip)
        end,
        activities: household.activities.includes(:actor).order(:created_at).map do |activity|
          ActivitySerializer.render(activity)
        end
      }
      Audit.call(
        action: "privacy.household_exported", actor:,
        subject_type: "Household", subject_id: household.id
      )
      payload
    end

    def self.shopping_entries(household)
      list = household.shopping_list
      return [] unless list

      list.shopping_entries.includes(:added_by, :updated_by)
    end
    private_class_method :shopping_entries

    def self.require_owner!(household, actor)
      return if household.household_memberships.find_by(user: actor)&.owner?

      raise DomainError.new(
        code: "privacy.owner_required",
        message: "Only the household owner can export all household data.",
        status: :forbidden
      )
    end
    private_class_method :require_owner!
  end
end
