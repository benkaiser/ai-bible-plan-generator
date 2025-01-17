class CreatePlanInstanceReadings < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_instance_readings do |t|
      t.references :plan_instance, null: false, foreign_key: true
      t.integer :day_number
      t.integer :reading_index
      t.boolean :completed

      t.timestamps
    end
  end
end
