class PlansController < ApplicationController
  include ActionController::Live
  before_action :authenticate_user!, only: [:generate_plan, :new, :create]
  protect_from_forgery with: :null_session

  PLAN_GENERATION_PROMPT = File.read(Rails.root.join('app', 'prompts', 'plan_generation.txt'))

  def index
    @created_plans = current_user.plans
    @active_plan_instances = current_user.active_plan_instances
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
      render :new
    end
  end

  def generate_plan
    topic = params[:topic]
    length = params[:length].to_i

    response.headers['Content-Type'] = 'text/event-stream'

    client = OpenAI::Client.new()

    prompt = PLAN_GENERATION_PROMPT.gsub("{length}", length.to_s).gsub("{topic}", topic)

    client.chat(
      parameters: {
        model: "accounts/fireworks/models/llama-v3p1-8b-instruct", # Required.
        messages: [
          {
            role: "user",
            content: prompt
          }], # Required.
        response_format: { type: "json_object" },
        temperature: 0.5,
        stream: proc do |chunk, _bytesize|
          response.stream.write "data: #{chunk.dig('choices', 0, 'delta', 'content')}\n\n"
        end
      }
    )

    response.stream.write "data: [DONE]\n\n"
  rescue => e
    response.stream.write "data: Error: #{e.message}\n\n"
  ensure
    response.stream.close
  end

  private

  def plan_params
    params.require(:plan).permit(:name, :description, :cover_photo, :days)
  end
end