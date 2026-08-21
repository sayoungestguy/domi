class DomainError < StandardError
  attr_reader :code, :status, :details

  def initialize(code:, message:, status:, details: {})
    super(message)
    @code = code
    @status = status
    @details = details
  end
end
