require "digest"

module Authentication
  module Token
    module_function

    def generate(prefix)
      "domi_#{prefix}_#{SecureRandom.urlsafe_base64(32)}"
    end

    def digest(token)
      Digest::SHA256.hexdigest(token.to_s)
    end
  end
end
