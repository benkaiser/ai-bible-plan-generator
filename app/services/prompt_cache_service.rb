require 'digest/md5'

class PromptCacheService
  def initialize(prompt:, messages:, model:, temperature:, response_format: nil)
    @prompt = prompt
    @messages = messages
    @model = model
    @temperature = temperature
    @response_format = response_format
  end

  def fetch_or_generate(&block)
    cache_key = generate_cache_key
    cached_response = PromptCache.find_by(key: cache_key)

    if cached_response
      block.call(cached_response.response) if block_given?
      return cached_response.response
    else
      response = generate_response(&block)
      PromptCache.create(key: cache_key, response: response)
      return response
    end
  end

  private

  def generate_cache_key
    Digest::MD5.hexdigest("#{@prompt}-#{@messages}-#{@model}-#{@temperature}")
  end

  def generate_response
    client = OpenAI::Client.new()
    response_chunks = []
    parameters = {
      response_format: @response_format,
      model: @model,
      messages: @messages,
      temperature: @temperature
    }

    if block_given?
      parameters[:stream] = proc do |chunk, _bytesize|
        response_chunks << chunk
        yield chunk.to_json if block_given?
      end
    end

    response = client.chat(parameters: parameters)
    response_chunks.empty? ? response.to_json : response_chunks.to_json
  end
end
