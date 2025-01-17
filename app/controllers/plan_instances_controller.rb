class PlanInstancesController < ApplicationController
  before_action :authenticate_user!

  def create
    @plan = Plan.find(params[:plan_id])
    @plan_instance = PlanInstance.new(plan: @plan, start_date: Date.today)

    if @plan_instance.save
      PlanInstanceUser.create(plan_instance: @plan_instance, user: current_user, approved: true, creator: true, completed: false)
      redirect_to @plan_instance, notice: 'You have now started this plan.'
    else
      redirect_to @plan, alert: 'Failed to create plan instance.'
    end
  end

  def show
    @plan_instance = PlanInstance.find(params[:id])
  end
end
