class UpdateForeignKeyConstraintsForUserDeletion < ActiveRecord::Migration[8.0]
  def up
    # Remove existing foreign keys
    remove_foreign_key :plan_instance_users, :users
    remove_foreign_key :plan_instance_comments, :users
    remove_foreign_key :notification_subscriptions, :users
    remove_foreign_key :plans, :users if foreign_key_exists?(:plans, :users)

    # Add them back with ON DELETE options
    add_foreign_key :plan_instance_users, :users, on_delete: :cascade
    add_foreign_key :plan_instance_comments, :users, on_delete: :nullify
    add_foreign_key :notification_subscriptions, :users, on_delete: :cascade
    add_foreign_key :plans, :users, on_delete: :nullify
  end

  def down
    # Remove modified foreign keys
    remove_foreign_key :plan_instance_users, :users
    remove_foreign_key :plan_instance_comments, :users
    remove_foreign_key :notification_subscriptions, :users
    remove_foreign_key :plans, :users

    # Add them back without ON DELETE options
    add_foreign_key :plan_instance_users, :users
    add_foreign_key :plan_instance_comments, :users
    add_foreign_key :notification_subscriptions, :users
    add_foreign_key :plans, :users
  end
end
