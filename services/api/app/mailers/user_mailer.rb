require "cgi"

class UserMailer < ApplicationMailer
  def email_verification(user, token)
    @user = user
    @url = "#{ENV.fetch('MOBILE_APP_SCHEME', 'domi://')}verify-email?token=#{CGI.escape(token)}"

    mail(to: user.email, subject: "Verify your Domi email") do |format|
      format.text do
        render plain: <<~TEXT
          Hello #{user.display_name},

          Verify your email address to start using Domi:
          #{@url}

          This link expires in 24 hours. If you did not create a Domi account,
          you can ignore this email.
        TEXT
      end
    end
  end

  def password_reset(user, token)
    @user = user
    @url = "#{ENV.fetch('MOBILE_APP_SCHEME', 'domi://')}reset-password?token=#{CGI.escape(token)}"

    mail(to: user.email, subject: "Reset your Domi password") do |format|
      format.text do
        render plain: <<~TEXT
          Hello #{user.display_name},

          Reset your Domi password:
          #{@url}

          This link expires in one hour. If you did not request a reset, you can
          ignore this email.
        TEXT
      end
    end
  end
end
