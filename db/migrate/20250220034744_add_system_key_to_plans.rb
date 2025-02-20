class AddSystemKeyToPlans < ActiveRecord::Migration[8.0]
  def change
    add_column :plans, :system_key, :string
  end
end
