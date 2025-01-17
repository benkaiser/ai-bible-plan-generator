class CreatePlanInstanceUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_instance_users do |t|
      t.references :plan_instance, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.boolean :approved
      t.boolean :creator
      t.boolean :completed

      t.timestamps
    end
  end
end
