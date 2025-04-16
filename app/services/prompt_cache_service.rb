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

  # Method to fetch the complete content in one go (not streaming)
  def fetch_complete_content
    cache_key = generate_cache_key
    cached_response = PromptCache.find_by(key: cache_key)

    if cached_response
      return cached_response.response
    end

    response = generate_response()

    # Cache the complete response
    PromptCache.create(key: cache_key, response: response)

    return response
  end

  def extract_content_from_response(json_content)
    begin
      content_text = ""

      # Parse the JSON response
      parsed_data = JSON.parse(json_content)

      if parsed_data.is_a?(Array)
        # Handle array of chunks
        parsed_data.each do |chunk|
          if chunk['choices'] && chunk['choices'][0] && chunk['choices'][0]['delta'] &&
             chunk['choices'][0]['delta']['content']
            content_text += chunk['choices'][0]['delta']['content']
          end
        end
      else
        # Handle single response object
        if parsed_data['choices'] && parsed_data['choices'][0]
          if parsed_data['choices'][0]['message'] && parsed_data['choices'][0]['message']['content']
            # Format for complete responses
            content_text = parsed_data['choices'][0]['message']['content']
          elsif parsed_data['choices'][0]['text']
            # Alternative format
            content_text = parsed_data['choices'][0]['text']
          end
        end
      end

      return content_text
    rescue JSON::ParserError => e
      Rails.logger.error("Failed to parse JSON content: #{e.message}")
      return ""
    end
  end

  def fetch_content_as_text
    json_content = fetch_complete_content
    extract_content_from_response(json_content)
  end

  private

  def generate_cache_key
    Digest::MD5.hexdigest("#{@prompt}-#{@messages}-#{@model}-#{@temperature}-#{@max_tokens}")
  end

  def generate_response
    client = OpenAI::Client.new()
    response_chunks = []
    parameters = {
      response_format: @response_format,
      model: @model,
      messages: @messages,
      temperature: @temperature,
      max_tokens: @max_tokens
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
