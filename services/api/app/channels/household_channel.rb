class HouseholdChannel < ApplicationCable::Channel
  def subscribed
    session = Authentication::AuthenticateAccessToken.call(params["token"])
    household = session&.user&.households&.find_by(id: params["householdId"])
    return reject unless household

    stream_for household
  end
end
