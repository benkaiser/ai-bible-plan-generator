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
      block.call(cached_response.response)
    else
      response = generate_response(&block)
      PromptCache.create(key: cache_key, response: response)
    end
  end

  private

  def generate_cache_key
    Digest::MD5.hexdigest("#{@prompt}-#{@messages}-#{@model}-#{@temperature}")
  end

  def generate_response
    client = OpenAI::Client.new()
    response_chunks = []
    client.chat(
      parameters: {
        response_format: @response_format,
        model: @model,
        messages: @messages,
        temperature: @temperature,
        stream: proc do |chunk, _bytesize|
          response_chunks << chunk
          yield chunk.to_json if block_given?
        end
      }
    )
    response_chunks.to_json
  end
end
