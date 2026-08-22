require "test_helper"
require "yaml"

class OpenapiContractTest < ActiveSupport::TestCase
  CONTRACT_PATH = Rails.root.join("..", "..", "packages", "contracts", "openapi.yaml")

  test "the checked-in contract describes the current API and health endpoint" do
    contract = YAML.safe_load_file(CONTRACT_PATH, aliases: true)

    assert_equal "3.1.0", contract.fetch("openapi")
    assert_equal "1.2.0", contract.dig("info", "version")
    expected_paths = %w[
      /api/v1/health
      /api/v1/auth/register
      /api/v1/auth/session
      /api/v1/auth/session/refresh
      /api/v1/auth/email-verification
      /api/v1/auth/email-verification/resend
      /api/v1/auth/password-reset
      /api/v1/me
      /api/v1/households
      /api/v1/households/{householdId}
      /api/v1/households/{householdId}/memberships
      /api/v1/households/{householdId}/memberships/{membershipId}
      /api/v1/households/{householdId}/membership
      /api/v1/households/{householdId}/ownership
      /api/v1/households/{householdId}/invitations
      /api/v1/households/{householdId}/invitations/{invitationId}
      /api/v1/households/{householdId}/categories
      /api/v1/households/{householdId}/categories/{categoryId}
      /api/v1/households/{householdId}/inventory/summary
      /api/v1/households/{householdId}/inventory-items
      /api/v1/households/{householdId}/inventory-items/{inventoryItemId}
      /api/v1/households/{householdId}/inventory-items/{inventoryItemId}/status
      /api/v1/households/{householdId}/inventory-items/{inventoryItemId}/archive
      /api/v1/households/{householdId}/inventory-items/{inventoryItemId}/restore
      /api/v1/invitations/accept
    ]
    assert_equal expected_paths.sort, contract.fetch("paths").keys.sort

    local_references(contract).each do |reference|
      assert reference.start_with?("#/"), "External contract reference is not pinned: #{reference}"
      assert local_reference_resolves?(contract, reference), "Unresolved OpenAPI reference: #{reference}"
    end
  end

  private

  def local_references(value)
    case value
    when Hash
      value.flat_map do |key, nested|
        key == "$ref" ? [ nested ] : local_references(nested)
      end
    when Array
      value.flat_map { |nested| local_references(nested) }
    else
      []
    end
  end

  def local_reference_resolves?(contract, reference)
    reference.delete_prefix("#/").split("/").reduce(contract) do |node, segment|
      break unless node.is_a?(Hash)

      node[segment.gsub("~1", "/").gsub("~0", "~")]
    end.present?
  end
end
