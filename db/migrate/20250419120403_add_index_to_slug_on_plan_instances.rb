class AddIndexToSlugOnPlanInstances < ActiveRecord::Migration[8.0]
  def change
    add_index :plan_instances, :slug, unique: true
  end
end
