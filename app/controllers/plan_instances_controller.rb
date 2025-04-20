class PlanInstancesController < ApplicationController
  include ActionController::Live
  include BibleHelper
  require 'redcarpet'
  require 'redcarpet/render_strip'

  OVERVIEW_GENERATION_PROMPT = File.read(Rails.root.join('app', 'prompts', 'overview_generation_generic.txt'))

  before_action :check_plan_accessibility, only: [:show]
  before_action :ensure_authenticated_or_redirect, only: [:public_show]

  def create
    current_date = params[:current_date].present? ? Date.parse(params[:current_date]) : Date.today
    @plan = Plan.find(params[:plan_id])
    @plan_instance = PlanInstance.new(plan: @plan, start_date: current_date)

    if @plan_instance.save
      # Create the creator's plan instance user record
      PlanInstanceUser.create(plan_instance: @plan_instance, user: current_user, approved: true, creator: true, completed: false, removed: false)

      # Handle collaborative plans with other users
      if params[:usernames].present? && params[:usernames].is_a?(Array)
        params[:usernames].each do |username|
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

      redirect_to @plan_instance, notice: 'You have now started this plan.'
    else
      redirect_to @plan, alert: 'Failed to create plan instance.'
    end
  end

  def show
    @plan_instance = PlanInstance.find(params[:id])
    if !current_user && @plan_instance.visibility == 'public'
      redirect_to public_plan_path(@plan_instance.slug.presence || @plan_instance.id)
      return
    end

    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)

    # If user is not a member but plan is public, create a membership automatically
    if !@plan_instance_user && @plan_instance.visibility == 'public' && current_user
      @plan_instance_user = PlanInstanceUser.create(
        plan_instance: @plan_instance,
        user: current_user,
        approved: true,
        creator: false,
        completed: false,
        removed: false
      )
      # show the welcome message
      flash[:notice] = 'You have joined the plan!'
    end

    @plan_instance_other_users = @plan_instance.plan_instance_users.where.not(user: current_user).where(approved: true)
    @plan_instance_other_users = @plan_instance_other_users.map do |plan_instance_user|
      {
        username: plan_instance_user.user.username,
        latest_uncompleted_day: plan_instance_user.latest_uncompleted_day,
      }
    end
  end

  # Public view of a plan for non-members
  def public_show
    @plan_instance = if params[:slug].present?
                      PlanInstance.find_by(slug: params[:slug])
                    else
                      PlanInstance.find(params[:id])
                    end

    # Ensure the plan is public
    unless @plan_instance&.visibility == 'public'
      redirect_to root_path, alert: 'This plan is not available for public viewing.'
      return
    end

    # If user is logged in, redirect to show page which will handle membership
    if current_user
      redirect_to plan_instance_path(@plan_instance)
      return
    end

    # For non-logged in users, show public view with join option
    @plan = @plan_instance.plan
  end

  def destroy
    @plan_instance = PlanInstance.find(params[:id])
    plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
    plan_instance_user.notification_subscriptions.destroy_all
    plan_instance_user.update(removed: true)
    redirect_to plans_path, notice: 'Plan stopped.'
  end

  # Post request to generate an AI generated overview for a given day
  # this endpoint generates the overview and caches it in the database.
  def day_overview
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
    @day_number = params[:day_number].to_i

    prompt = prepare_day_content(@plan_instance, @day_number)
    return unless prompt # Return if an error occurred

    # now actually make the API calls and stream the response
    response.headers['Content-Type'] = 'text/event-stream'

    cache_service = PromptCacheService.new(
      prompt: prompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
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

  # Post request, containing the tts contents for a given day
  def get_daily_reading_tts
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
    @day_number = params[:day_number].to_i

    prompt = prepare_day_content(@plan_instance, @day_number)
    return render json: { success: false, error: 'Day not found' }, status: :not_found unless prompt

    # Generate the content text
    cache_service = PromptCacheService.new(
      prompt: prompt,
      messages: [{ role: "user", content: prompt }],
      model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
      temperature: 0.5
    )

    # Get the full text content directly from the service
    content_text = cache_service.fetch_content_as_text

    # Ensure we have content before proceeding
    if content_text.blank?
      return render json: { success: false, error: 'No content generated' }, status: :unprocessable_entity
    end

    # Strip markdown before sending to TTS
    plain_text = strip_markdown(content_text)

    # Use the Replicate TTS service to generate audio
    tts_service = ReplicateTtsService.new(plain_text)
    result = tts_service.generate_audio

    if result[:success]
      render json: { success: true, audio_url: result[:audio_url] }
    else
      render json: { success: false, error: result[:error] }, status: :internal_server_error
    end
  end

  def update_reading_status
    plan_instance_user = PlanInstanceUser.find_by(id: params[:plan_instance_user_id], user: current_user)

    if plan_instance_user
      plan_instance_reading = PlanInstanceReading.find_or_initialize_by(
        plan_instance_user: plan_instance_user,
        day_number: params[:day_number],
        reading_index: params[:reading_index]
      )
      plan_instance_reading.completed = params[:completed]
      plan_instance_reading.save!
      render json: { success: true }
    else
      render json: { success: false, error: 'Plan instance user not found or not authorized' }, status: :not_found
    end
  end

  def update_plan_status
    plan_instance_user = PlanInstanceUser.find_by(id: params[:plan_instance_user_id], user: current_user)

    if plan_instance_user
      if params[:completed]
        plan_instance_user.update(completed: true, completed_at: Time.current)
        plan_instance_user.notification_subscriptions.destroy_all
      else
        plan_instance_user.update(completed: false, completed_at: nil)
      end
      render json: { success: true }
    else
      render json: { success: false, error: 'Plan instance user not found or not authorized' }, status: :not_found
    end
  end

  # Method to handle confirmation of plan participation
  def confirm_participation
    plan_instance_user = PlanInstanceUser.find_by(id: params[:plan_instance_user_id])

    if plan_instance_user && plan_instance_user.user.id == current_user.id && !plan_instance_user.approved
      plan_instance_user.update(approved: true)
      redirect_to plan_instance_path(plan_instance_user.plan_instance), notice: 'You have successfully joined the reading plan!'
    else
      redirect_to root_path, alert: 'Invalid or expired invitation link.'
    end
  end

  # Method to handle declining plan participation
  def decline_invitation
    plan_instance_user = PlanInstanceUser.find_by(id: params[:plan_instance_user_id])

    if plan_instance_user && plan_instance_user.user.id == current_user.id && !plan_instance_user.approved
      plan_instance_user.update(removed: true)
      redirect_to plans_path, notice: 'You have declined the reading plan invitation.'
    else
      redirect_to root_path, alert: 'Invalid or expired invitation link.'
    end
  end

  # Method to get all members of a plan instance
  def members
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)

    # Ensure the current user is a member of this plan
    unless @plan_instance_user
      render json: { error: 'You are not authorized to view this plan' }, status: :unauthorized
      return
    end

    # Get all users in this plan instance
    @members = @plan_instance.plan_instance_users.includes(:user).map do |piu|
      status = if piu.completed
                'completed'
              elsif !piu.approved && !piu.removed
                'pending'
              elsif !piu.removed
                'active'
              end

      next if piu.removed || !status

      {
        id: piu.id,
        username: piu.user.username,
        status: status,
        completedAt: piu.completed_at,
        isCreator: piu.creator
      }
    end.compact

    render json: { members: @members }
  end

  # Method to invite a user to a plan instance
  def invite_user
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)

    # Ensure the current user is a member of this plan
    unless @plan_instance_user
      render json: { error: 'You are not authorized to invite users to this plan' }, status: :unauthorized
      return
    end

    username = params[:username]
    invited_user = User.find_by("lower(username) = ?", username.downcase)

    # Check if user exists
    unless invited_user
      render json: { error: 'User not found' }, status: :not_found
      return
    end

    # Check if user is already in the plan
    existing_membership = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: invited_user)
    if existing_membership
      if existing_membership.removed
        # Re-invite the user if they were previously removed
        existing_membership.update(removed: false, approved: false)
        PlanMailer.invitation_email(invited_user, current_user, @plan_instance).deliver_later
        render json: { message: 'User re-invited successfully' }
      elsif existing_membership.approved
        render json: { error: 'User is already a member of this plan' }, status: :unprocessable_entity
      else
        render json: { error: 'User has already been invited to this plan' }, status: :unprocessable_entity
      end
      return
    end

    # Create invitation
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

    render json: { message: 'User invited successfully' }
  end

  # Method to get plan settings
  def settings
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)

    # Ensure the current user is a member of this plan
    unless @plan_instance_user
      render json: { error: 'You are not authorized to view this plan settings' }, status: :unauthorized
      return
    end

    render json: {
      visibility: @plan_instance.visibility,
      slug: @plan_instance.slug
    }
  end

  # Method to update plan settings
  def update_settings
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)

    # Ensure the current user is the creator of this plan
    unless @plan_instance_user&.creator
      render json: { error: 'You are not authorized to update this plan settings' }, status: :unauthorized
      return
    end

    # Update settings
    if @plan_instance.update(settings_params)
      render json: {
        message: 'Settings updated successfully',
        visibility: @plan_instance.visibility,
        slug: @plan_instance.slug
      }
    else
      render json: {
        error: 'Failed to update settings',
        errors: @plan_instance.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # Method to check slug availability
  def check_slug
    current_plan_id = params[:current_plan_instance_id]
    slug = params[:slug]

    # Check if slug is available (excluding the current plan)
    is_available = if current_plan_id.present?
                     !PlanInstance.where.not(id: current_plan_id).exists?(slug: slug)
                   else
                     !PlanInstance.exists?(slug: slug)
                   end

    render json: { available: is_available }
  end

  private

  def strip_markdown(text)
    Redcarpet::Markdown.new(Redcarpet::Render::StripDown).render(text)
  end

  def prepare_day_content(plan_instance, day_number)
    # extract day from plan_instance
    day = plan_instance.plan.days[day_number - 1]
    # return an error if day.day_number == day_number
    if day.nil? || day['day_number'] != day_number
      return nil
    end

    # for each of the readings, extract the book chapter and verse_range from them. Use them to pull out the
    # bible verses from the ChapterVerse model.
    scriptures = ""
    readings = day['readings'].map do |reading|
      book = ensure_book_short_name(reading['book'])
      chapter = reading['chapter']
      verse_range = reading['verse_range']

      verses = ChapterVerse.where(bookId: book, chapterNumber: chapter).order(:number)

      if verse_range.present?
        range_parts = verse_range.split('-').map(&:to_i)
        if range_parts.size == 1
          verses = verses.where(number: range_parts[0])
        elsif range_parts.size == 2
          verses = verses.where("number >= ? AND number <= ?", range_parts[0], range_parts[1])
        end
      end

      verse_reference = if verse_range.present?
        ":#{verse_range}"
      else
        ""
      end
      scriptures += "#{short_name_to_long_name(book)} #{chapter}#{verse_reference}\n#{verses.map(&:text).join(' ')}\n"
    end

    prompt = OVERVIEW_GENERATION_PROMPT.gsub("{scriptures}", scriptures.to_s)
                                     .gsub("{title}", plan_instance.plan.name)
                                     .gsub("{outline}", day['outline'])
                                     .gsub("{day}", day['day_number'].to_s)
                                     .gsub("{total_days}", plan_instance.plan.days.size.to_s)

    return prompt
  end

  def settings_params
    params.require(:plan_instance).permit(:visibility, :slug)
  end

  def check_plan_accessibility
    plan_instance = PlanInstance.find(params[:id])

    # Check if user is authenticated
    if current_user
      # Check if user is a member of the plan or if plan is public
      is_member = PlanInstanceUser.exists?(plan_instance: plan_instance, user: current_user, removed: false)

      unless is_member || plan_instance.visibility == 'public'
        redirect_to root_path, alert: 'You do not have access to this plan.'
      end
    else
      # Unauthenticated users can only access public plans through the public view
      unless plan_instance.visibility == 'public'
        redirect_to new_user_session_path, alert: 'Please log in to access this plan.'
      end
    end
  end

  def ensure_authenticated_or_redirect
    unless current_user
      # Store the plan instance URL to redirect back after login
      store_location_for(:user, request.original_url)
    end
  end

  def store_location_for(resource, location)
    session["#{resource}_return_to"] = location
  end

  def after_sign_in_path_for(resource)
    stored_location_for(resource) || super
  end

  def stored_location_for(resource)
    session.delete("#{resource}_return_to")
  end
end
