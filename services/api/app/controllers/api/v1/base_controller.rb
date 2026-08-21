module Api
  module V1
    class BaseController < ApplicationController
      RATE_LIMIT_RESPONSE = lambda do
        render_error(
          "request.rate_limited",
          "Too many requests. Wait a moment and try again.",
          :too_many_requests
        )
      end

      rescue_from DomainError, with: :render_domain_error
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      rescue_from ActionController::ParameterMissing, with: :render_bad_request

      before_action :set_request_context

      private

      def authenticate_user!
        token = request.authorization.to_s.delete_prefix("Bearer ")
        session = Authentication::AuthenticateAccessToken.call(token)
        unless session
          raise DomainError.new(
            code: "auth.unauthorized",
            message: "Sign in to continue.",
            status: :unauthorized
          )
        end

        Current.user = session.user
        Current.auth_session = session
      end

      def current_user
        Current.user
      end

      def current_auth_session
        Current.auth_session
      end

      def find_household!(id = params[:household_id] || params[:id])
        current_user.households.find(id)
      end

      def require_owner!(household)
        return if HouseholdPolicy.new(current_user, household).owner?

        raise DomainError.new(
          code: "household.owner_required",
          message: "Only the household owner can perform this action.",
          status: :forbidden
        )
      end

      def session_payload(result)
        {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          accessExpiresAt: result.session.access_expires_at.iso8601,
          refreshExpiresAt: result.session.refresh_expires_at.iso8601
        }
      end

      def issue_session(user)
        Authentication::IssueSession.call(
          user:,
          user_agent: request.user_agent,
          ip_address: request.remote_ip
        )
      end

      def render_domain_error(error)
        render_error(error.code, error.message, error.status, error.details)
      end

      def render_not_found
        render_error("resource.not_found", "The requested resource was not found.", :not_found)
      end

      def render_record_invalid(error)
        details = error.record.errors.to_hash(true).transform_keys { |key| key.to_s.camelize(:lower) }
        render_error("validation.failed", "Some fields need your attention.", :unprocessable_entity, details)
      end

      def render_bad_request(error)
        render_error("request.invalid", error.message, :bad_request)
      end

      def render_error(code, message, status, details = {})
        render json: {
          error: {
            code:,
            message:,
            requestId: request.request_id,
            details:
          }
        }, status:
      end

      def set_request_context
        Current.request_id = request.request_id
      end
    end
  end
end
