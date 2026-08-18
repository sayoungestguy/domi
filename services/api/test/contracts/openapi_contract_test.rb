require "test_helper"
require "yaml"

class OpenapiContractTest < ActiveSupport::TestCase
  CONTRACT_PATH = Rails.root.join("..", "..", "packages", "contracts", "openapi.yaml")

  test "the checked-in contract describes the current API and health endpoint" do
    contract = YAML.safe_load_file(CONTRACT_PATH, aliases: true)

    assert_equal "3.1.0", contract.fetch("openapi")
    assert_equal "1.0.0", contract.dig("info", "version")
    assert contract.fetch("paths").key?("/api/v1/health")
  end
end
