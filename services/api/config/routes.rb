Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"
    end
  end

  # Framework-level liveness probe. The versioned health endpoint above is the
  # client-facing connectivity contract.
  get "up" => "rails/health#show", as: :rails_health_check
end
