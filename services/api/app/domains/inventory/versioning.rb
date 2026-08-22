module Inventory
  module Versioning
    module_function

    def ensure!(item, expected_version)
      return if item.lock_version == expected_version.to_i

      raise DomainError.new(
        code: "inventory.version_conflict",
        message: "This item changed on another device.",
        status: :conflict,
        details: { currentVersion: item.lock_version }
      )
    end
  end
end
