class AddPlanInstanceUserToNotificationSubscriptions < ActiveRecord::Migration[8.0]
  def change
    add_reference :notification_subscriptions, :plan_instance_user, null: false, foreign_key: true
  end
end
