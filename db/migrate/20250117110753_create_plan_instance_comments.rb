class CreatePlanInstanceComments < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_instance_comments do |t|
      t.references :plan_instance, null: false, foreign_key: true
      t.integer :day_number
      t.references :user, null: false, foreign_key: true
      t.text :comment

      t.timestamps
    end
  end
end
