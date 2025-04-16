class ReplicateTtsService
  attr_reader :text, :speed, :voice

  DEFAULT_VOICE = "af_bella"
  DEFAULT_SPEED = 1
  TTS_MODEL_VERSION = "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13"

  def initialize(text, options = {})
    @text = text
    @speed = options[:speed] || DEFAULT_SPEED
    @voice = options[:voice] || DEFAULT_VOICE
  end

  def generate_audio
    require 'net/http'
    require 'uri'
    require 'json'

    uri = URI.parse("https://api.replicate.com/v1/predictions")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri.path, {
      'Content-Type' => 'application/json',
      'Authorization' => "Token #{ENV['REPLICATE_API_TOKEN']}",
      'Prefer' => 'wait'
    })

    request.body = {
      version: TTS_MODEL_VERSION,
      input: {
        text: @text,
        speed: @speed,
        voice: @voice
      }
    }.to_json

    # Log the request body for debugging
    Rails.logger.info("Replicate TTS request body: #{request.body}")
    # Log the request headers for debugging
    Rails.logger.info("Replicate TTS request headers: #{request.each_header.to_h}")
    # Log the request URL for debugging
    Rails.logger.info("Replicate TTS request URL: #{uri.to_s}")

    response = http.request(request)
    result = JSON.parse(response.body)

    # Log the response for debugging
    Rails.logger.info("Replicate TTS request response: #{response.body}")

    if response.code.to_i == 201 || response.code.to_i == 200
      if result['output']
        return { success: true, audio_url: result['output'] }
      else
        return { success: false, error: 'TTS generation failed' }
      end
    else
      return { success: false, error: 'Failed to start TTS generation', details: result }
    end
  rescue => e
    Rails.logger.error("Replicate TTS error: #{e.message}")
    return { success: false, error: "TTS service error: #{e.message}" }
  end
end
