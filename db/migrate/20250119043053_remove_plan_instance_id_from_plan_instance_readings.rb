class RemovePlanInstanceIdFromPlanInstanceReadings < ActiveRecord::Migration[8.0]
  def change
    remove_reference :plan_instance_readings, :plan_instance, null: false, foreign_key: true
  end
end
