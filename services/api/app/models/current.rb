class Current < ActiveSupport::CurrentAttributes
  attribute :user, :auth_session, :request_id
end
