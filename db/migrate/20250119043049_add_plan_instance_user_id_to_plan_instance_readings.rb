class AddPlanInstanceUserIdToPlanInstanceReadings < ActiveRecord::Migration[8.0]
  def change
    add_reference :plan_instance_readings, :plan_instance_user, null: false, foreign_key: true
  end
end
