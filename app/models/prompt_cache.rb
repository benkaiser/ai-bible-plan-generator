class PromptCache < ApplicationRecord
  validates :key, presence: true, uniqueness: true
  validates :job_id, uniqueness: true, allow_blank: true

  # For storing the full LLM request data for Node.js worker
  def store_llm_request(messages:, model:, temperature:, max_tokens:, response_format: nil)
    self.llm_request = {
      messages: messages,
      model: model,
      temperature: temperature,
      max_tokens: max_tokens,
      response_format: response_format
    }.to_json
    self.llm_model = model
    self.llm_temperature = temperature
    self.llm_max_tokens = max_tokens
  end

  def llm_request_data
    return nil unless llm_request.present?
    JSON.parse(llm_request)
  end
end
