class NotificationSubscriptionsController < ApplicationController
  protect_from_forgery with: :null_session

  def create
    plan_instance_user = PlanInstanceUser.find_by(plan_instance_id: params[:plan_instance_id], user: current_user)
    subscription = plan_instance_user.notification_subscriptions.new(subscription_params.merge(user: current_user))
    if subscription.save
      render json: { status: 'success' }, status: :created
    else
      render json: { errors: subscription.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def subscription_params
    params.permit(:endpoint, :p256dh, :auth, :time).tap do |whitelisted|
      %i[endpoint p256dh auth time].each do |key|
        raise ActionController::ParameterMissing, key unless whitelisted.key?(key)
      end
    end
  end
end