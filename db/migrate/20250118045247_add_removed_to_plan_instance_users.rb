class AddRemovedToPlanInstanceUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :plan_instance_users, :removed, :boolean
  end
end
