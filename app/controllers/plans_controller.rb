require 'json'

class PlansController < ApplicationController
  include ActionController::Live
  before_action :authenticate_user!, only: [:generate_plan, :new, :create]
  protect_from_forgery with: :null_session

  PLAN_GENERATION_PROMPT = File.read(Rails.root.join('app', 'prompts', 'plan_generation.txt'))
  DAY_FIXING_PROMPT = File.read(Rails.root.join('app', 'prompts', 'day_fixing.txt'))

  def index
    @created_plans = current_user.plans
    @active_plan_instance_users = current_user.active_plan_instance_users
  end

  def new
    @plan = Plan.new
  end

  def show
    @plan = Plan.find(params[:id])
  end

  def create
    @plan = current_user.plans.build(plan_params)
    @plan.days = JSON.parse(plan_params[:days]) if plan_params[:days].is_a?(String)

    if @plan.save
      redirect_to plans_path, notice: 'Plan was successfully created.'
    else
      logger.error "Failed to create plan: #{@plan.errors.full_messages.join(', ')}"
      render :new, status: :unprocessable_entity, alert: 'Failed to create plan.'
    end
  end

  def generate_plan
    topic = params[:topic]
    length = params[:length].to_i

    response.headers['Content-Type'] = 'text/event-stream'

    prompt = PLAN_GENERATION_PROMPT.gsub("{length}", length.to_s).gsub("{topic}", topic)

    cache_service = PromptCacheService.new(
      prompt: prompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
      temperature: 0.5
    )

    cache_service.fetch_or_generate do |chunk|
      response.stream.write "data: #{chunk.gsub("\n", "\\n")}\n\n"
    end
    response.stream.write "data: [DONE]\n\n"
  rescue => e
    response.stream.write "data: Error: #{e.message}\n\n"
  ensure
    response.stream.close
  end

  # this takes in a JSON object for `reading` with the invalid scripture lookup, and `day` the reading belongs too.
  # it needs to call the LLM, receive back the new `day` JSON object and send it down in one JSON response.
  # To do this it should do a call similar to above, but use the DAY_FIXING_PROMPT up above. And do not use the streaming responses, just send a single JSON payload with the full LLM response.
  def fix_reading
    client = OpenAI::Client.new()
    params.require(:reading)
    params.require(:day)
    permitted_params = params.permit(reading: {}, day: {})
    prompt = DAY_FIXING_PROMPT.gsub("{reading}", permitted_params[:reading].to_json).gsub("{day}", permitted_params[:day].to_json)

    cache_service = PromptCacheService.new(
      prompt: prompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      model: "accounts/fireworks/models/deepseek-v3", # this model seems to perform better at fixing mistakes, even though it is slower.
      temperature: 0.5
    )
    response = cache_service.fetch_or_generate

    render json: JSON.parse(response).dig("choices", 0, "message", "content")
  rescue => e
    render json: { error: e.message }, status: :internal_server_error
  end


  private

  def plan_params
    params.require(:plan).permit(:name, :description, :cover_photo, :days)
  end

  def fix_reading_params
    params.permit(:reading, :day)
  end
end