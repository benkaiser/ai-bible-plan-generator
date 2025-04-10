class AddDeletedToPlanInstance < ActiveRecord::Migration[8.0]
  def change
    add_column :plan_instances, :deleted, :boolean
  end
end
