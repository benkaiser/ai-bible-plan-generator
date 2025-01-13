class PlansController < ApplicationController
  include ActionController::Live
  before_action :authenticate_user!, only: [:generate_plan, :new, :create]
  protect_from_forgery with: :null_session

  def index
    @plans = Plan.all
  end

  def new
    @plan = Plan.new
  end

  def create
    @plan = Plan.new(plan_params)
    if @plan.save
      redirect_to @plan, notice: 'Plan was successfully created.'
    else
      render :new
    end
  end

  def generate_plan
    topic = params[:topic]
    length = params[:length].to_i

    response.headers['Content-Type'] = 'text/event-stream'

    client = OpenAI::Client.new()

    client.chat(
      parameters: {
        model: "accounts/fireworks/models/llama-v3p1-8b-instruct", # Required.
        messages: [{ role: "user", content: "Generate a #{length}-day bible reading plan about #{topic}"}], # Required.
        temperature: 0.7,
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
    params.require(:plan).permit(:name, :description, :cover_photo, days: [:description, readings: [:book, :chapter, :verse_range, :whole_chapter]])
  end
end