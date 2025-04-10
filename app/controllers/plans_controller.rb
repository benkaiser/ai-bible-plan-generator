require 'json'

class PlansController < ApplicationController
  include ActionController::Live
  protect_from_forgery with: :null_session

  PLAN_GENERATION_PROMPT = File.read(Rails.root.join('app', 'prompts', 'plan_generation.txt'))
  DAY_FIXING_PROMPT = File.read(Rails.root.join('app', 'prompts', 'day_fixing.txt'))

  def index
    @created_plans = current_user.plans.order(created_at: :desc)
    @active_plan_instance_users = current_user.active_plan_instance_users.order(created_at: :desc)
    @plan_invitations = current_user.plan_instance_users.where(approved: false, removed: false).order(created_at: :desc)
    @completed_plan_instance_users_count = current_user.completed_plan_instance_users.size
    @community_plans = self.class.community_plans_cache
    if params[:completed] == "true"
      flash.now[:notice] = "You finished the plan! Great job. Go ahead and start another one today."
    end
  end

  def completed
    @completed_plan_instance_users = current_user.completed_plan_instance_users.order(created_at: :desc)
  end

  def new
    @plan = Plan.new
  end

  def show
    @plan = Plan.find(params[:id])
    if @plan.present? && (@plan.system_key.present? || @plan.user_id == current_user.id || @plan.plan_instances.joins(:plan_instance_users).exists?(plan_instance_users: { user_id: current_user.id }))
      render :show
    else
      # Handle the case where the conditions are not met
      redirect_to plans_path, alert: 'The plan you tried to access is unavailable.'
    end
  end

  def create
    @plan = current_user.plans.build(plan_params.except(:action, :collaborators, :start_date))
    @plan.days = JSON.parse(plan_params[:days]) if plan_params[:days].is_a?(String)

    if @plan.save
      if plan_params[:action] == "start" || plan_params[:action] == "start_together"
        # Use the submitted start_date or default to today's date
        start_date = plan_params[:start_date].present? ? Date.parse(plan_params[:start_date]) : Time.now.in_time_zone(current_user.timezone).to_date rescue Date.today
        @plan_instance = PlanInstance.new(plan: @plan, start_date: start_date)

        if @plan_instance.save
          PlanInstanceUser.create(plan_instance: @plan_instance, user: current_user, approved: true, creator: true, completed: false, removed: false)

          # Handle collaborative plans with other users
          if plan_params[:action] == "start_together" && plan_params[:collaborators].present?
            collaborators = JSON.parse(plan_params[:collaborators])
            collaborators.each do |username|
              invited_user = User.find_by("lower(username) = ?", username.downcase)
              if invited_user && invited_user != current_user
                plan_instance_user = PlanInstanceUser.create(
                  plan_instance: @plan_instance,
                  user: invited_user,
                  approved: false,
                  creator: false,
                  completed: false,
                  removed: false
                )

                # Send invitation email
                PlanMailer.invitation_email(invited_user, current_user, @plan_instance).deliver_later
              end
            end
          end

          redirect_to @plan_instance, notice: 'Plan saved and started.'
        end
      else
        redirect_to plans_path, notice: 'Plan was created.'
      end
    else
      logger.error "Failed to create plan: #{@plan.errors.full_messages.join(', ')}"
      render :new, status: :unprocessable_entity, alert: 'Failed to create plan.'
    end
  end

  def generate_plan
    topic = params[:topic]
    length = params[:length].to_i
    verseAmount = params[:verseAmount].to_i

    response.headers['Content-Type'] = 'text/event-stream'

    prompt = PLAN_GENERATION_PROMPT.gsub("{length}", length.to_s).gsub("{topic}", topic).gsub("{verseAmount}", verseAmount.to_s)
    puts prompt

    cache_service = PromptCacheService.new(
      prompt: prompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
      max_tokens: 16384,
      temperature: 0
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
      temperature: 0
    )
    response = cache_service.fetch_or_generate

    render json: JSON.parse(response).dig("choices", 0, "message", "content")
  rescue => e
    render json: { error: e.message }, status: :internal_server_error
  end


  private

  def plan_params
    params.require(:plan).permit(:name, :description, :cover_photo, :days, :action, :collaborators, :start_date)
  end

  def fix_reading_params
    params.permit(:reading, :day)
  end
end