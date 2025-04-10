class UpdatePlanInstancesForeignKeyConstraint < ActiveRecord::Migration[8.0]
  def up
    # Remove the existing foreign key constraint
    remove_foreign_key :plan_instances, :plans

    # Add a new foreign key constraint with ON DELETE CASCADE
    add_foreign_key :plan_instances, :plans, on_delete: :cascade
  end

  def down
    # Remove the cascade foreign key constraint
    remove_foreign_key :plan_instances, :plans

    # Add back the original foreign key constraint without cascade
    add_foreign_key :plan_instances, :plans
  end
end
