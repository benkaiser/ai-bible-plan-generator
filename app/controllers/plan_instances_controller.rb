class PlanInstancesController < ApplicationController
  before_action :authenticate_user!

  def create
    @plan = Plan.find(params[:plan_id])
    @plan_instance = PlanInstance.new(plan: @plan, start_date: Date.today)

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
end
