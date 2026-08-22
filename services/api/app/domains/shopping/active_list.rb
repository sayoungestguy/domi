module Shopping
  class ActiveList
    def self.call(household:)
      household.shopping_list || ShoppingList.create_or_find_by!(household:)
    end
  end
end
