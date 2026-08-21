Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"

      post "auth/register", to: "registrations#create"
      post "auth/session", to: "sessions#create"
      delete "auth/session", to: "sessions#destroy"
      post "auth/session/refresh", to: "token_refreshes#create"
      post "auth/email-verification", to: "email_verifications#create"
      post "auth/email-verification/resend", to: "email_verifications#resend"
      post "auth/password-reset", to: "password_resets#create"
      patch "auth/password-reset", to: "password_resets#update"

      resource :me, only: %i[show update], controller: "me"

      resources :households, only: %i[index show create update] do
        resources :memberships, only: %i[index destroy]
        delete "membership", to: "memberships#leave"
        post "ownership", to: "memberships#transfer"
        resources :invitations, only: %i[index create destroy]
      end
      post "invitations/accept", to: "invitations#accept"
    end
  end

  # Framework-level liveness probe. The versioned health endpoint above is the
  # client-facing connectivity contract.
  get "up" => "rails/health#show", as: :rails_health_check
end
