class CreateNotificationSubscriptions < ActiveRecord::Migration[8.0]
  def change
    create_table :notification_subscriptions do |t|
      t.string :endpoint
      t.string :p256dh
      t.string :auth
      t.string :time
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
