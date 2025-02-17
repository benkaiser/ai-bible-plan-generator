class AddCompletedAtToPlanInstanceUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :plan_instance_users, :completed_at, :datetime

    reversible do |dir|
      dir.up do
        PlanInstanceUser.reset_column_information
        PlanInstanceUser.where(completed: true, completed_at: nil).find_each do |plan_instance_user|
          plan_instance_user.update(completed_at: plan_instance_user.updated_at)
        end
      end
    end
  end
end
