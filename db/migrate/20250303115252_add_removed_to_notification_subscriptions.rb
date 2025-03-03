class AddRemovedToNotificationSubscriptions < ActiveRecord::Migration[8.0]
  def change
    add_column :notification_subscriptions, :removed, :boolean, default: false
  end
end
