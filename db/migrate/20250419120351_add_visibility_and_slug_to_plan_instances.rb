class AddVisibilityAndSlugToPlanInstances < ActiveRecord::Migration[8.0]
  def change
    add_column :plan_instances, :visibility, :string, default: 'private', null: false
    add_column :plan_instances, :slug, :string
  end
end
