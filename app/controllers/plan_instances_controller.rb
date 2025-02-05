class PlanInstancesController < ApplicationController
  include ActionController::Live
  include BibleHelper
  before_action :authenticate_user!

  OVERVIEW_GENERATION_PROMPT = File.read(Rails.root.join('app', 'prompts', 'overview_generation_generic.txt'))

  def create
    current_date = params[:current_date].present? ? Date.parse(params[:current_date]) : Date.today
    @plan = Plan.find(params[:plan_id])
    @plan_instance = PlanInstance.new(plan: @plan, start_date: current_date)

    if @plan_instance.save
      PlanInstanceUser.create(plan_instance: @plan_instance, user: current_user, approved: true, creator: true, completed: false, removed: false)
      redirect_to @plan_instance, notice: 'You have now started this plan.'
    else
      redirect_to @plan, alert: 'Failed to create plan instance.'
    end
  end

  def show
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
  end

  def destroy
    @plan_instance = PlanInstance.find(params[:id])
    plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
    plan_instance_user.update(removed: true)
    redirect_to plans_path, notice: 'Plan stopped.'
  end

  # Post request to generate an AI generated overview for a given day
  # this endpoint generates the overview and caches it in the database.
  def day_overview
    @plan_instance = PlanInstance.find(params[:id])
    @plan_instance_user = PlanInstanceUser.find_by(plan_instance: @plan_instance, user: current_user)
    @day_number = params[:day_number].to_i
    # extract day from plan_instance
    @day = @plan_instance.plan.days[@day_number - 1]
    # return an error if @day.day_number == @day_number
    if @day.nil? || @day['day_number'] != @day_number
      render json: { success: false, error: 'Day not found' }, status: :not_found
      return
    end
    # for each of the readings, extract the book chapter and verse_range from them. Use them to pull out the
    # bible verses from the ChapterVerse model.
    scriptures = ""
    @readings = @day['readings'].map do |reading|
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

      verses
      verse_reference = if verse_range.present?
        ":#{verse_range}"
      else
        ""
      end
      scriptures += "#{short_name_to_long_name(book)} #{chapter}#{verse_reference}\n#{verses.map(&:text).join(' ')}\n"
    end

    # now actually make the API calls and stream the response
    response.headers['Content-Type'] = 'text/event-stream'

    prompt = OVERVIEW_GENERATION_PROMPT.gsub("{scriptures}", scriptures.to_s)
                                      .gsub("{title}", @plan_instance.plan.name)
                                      .gsub("{outline}", @day['outline'])
                                      .gsub("{day}", @day['day_number'].to_s)
                                      .gsub("{total_days}", @plan_instance.plan.days.size.to_s)
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
      plan_instance_user.update(completed: params[:completed])
      render json: { success: true }
    else
      render json: { success: false, error: 'Plan instance user not found or not authorized' }, status: :not_found
    end
  end
end
