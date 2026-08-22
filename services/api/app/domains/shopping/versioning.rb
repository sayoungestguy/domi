module Shopping
  module Versioning
    module_function

    def ensure!(entry, expected_version)
      return if entry.lock_version == expected_version.to_i

      raise DomainError.new(
        code: "shopping.version_conflict",
        message: "This shopping entry changed on another device.",
        status: :conflict,
        details: { currentVersion: entry.lock_version }
      )
    end
  end
end
