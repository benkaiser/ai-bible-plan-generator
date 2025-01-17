class CreatePlanInstances < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_instances do |t|
      t.references :plan, null: false, foreign_key: true
      t.date :start_date

      t.timestamps
    end
  end
end
