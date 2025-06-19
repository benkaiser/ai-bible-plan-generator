require 'digest/md5'

class PromptCacheService
  def initialize(prompt:, messages:, model:, temperature:, max_tokens: 1000, response_format: nil)
    @prompt = prompt
    @messages = messages
    @model = model
    @temperature = temperature
    @max_tokens = max_tokens
    @response_format = response_format
  end

  def fetch_or_generate
    cache_key = generate_cache_key
    cached_response = PromptCache.find_by(key: cache_key)

    if cached_response&.response.present?
      return cached_response.response
    else
      # If no cached response, store the request for Node.js worker to process
      job_id = SecureRandom.uuid
      cache_record = PromptCache.find_or_create_by(key: cache_key) do |record|
        record.job_id = job_id
        record.store_llm_request(
          messages: @messages,
          model: @model,
          temperature: @temperature,
          max_tokens: @max_tokens,
          response_format: @response_format
        )
      end

      # If record exists but doesn't have job_id or llm_request, update it
      if cache_record.job_id.blank? || cache_record.llm_request.blank?
        cache_record.update!(
          job_id: job_id,
          llm_request: {
            messages: @messages,
            model: @model,
            temperature: @temperature,
            max_tokens: @max_tokens,
            response_format: @response_format
          }.to_json,
          llm_model: @model,
          llm_temperature: @temperature,
          llm_max_tokens: @max_tokens
        )
      end

      # Return the job_id so Rails can redirect the client to Node.js worker
      return { redirect_to_node: true, job_id: cache_record.job_id }
    end
  end

  # For TTS requests - always redirect to Node.js worker
  def prepare_for_node_worker
    cache_key = generate_cache_key
    job_id = SecureRandom.uuid

    cache_record = PromptCache.find_or_create_by(key: cache_key) do |record|
      record.job_id = job_id
      record.store_llm_request(
        messages: @messages,
        model: @model,
        temperature: @temperature,
        max_tokens: @max_tokens,
        response_format: @response_format
      )
    end

    # If record already exists but doesn't have a job_id, assign one
    if cache_record.job_id.blank?
      cache_record.update!(
        job_id: job_id,
        llm_request: {
          messages: @messages,
          model: @model,
          temperature: @temperature,
          max_tokens: @max_tokens,
          response_format: @response_format
        }.to_json
      )
    end

    cache_record.job_id
  end

  private

  def generate_cache_key
    Digest::MD5.hexdigest("#{@prompt}-#{@messages}-#{@model}-#{@temperature}-#{@max_tokens}")
  end
end
