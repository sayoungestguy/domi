module NotificationPreferenceSerializer
  module_function

  def render(preference)
    {
      memberJoined: preference.member_joined,
      shoppingEntryAdded: preference.shopping_entry_added,
      shoppingTripCompleted: preference.shopping_trip_completed
    }
  end
end
