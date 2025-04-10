class AddDeletedToPlan < ActiveRecord::Migration[8.0]
  def change
    add_column :plans, :deleted, :boolean
  end
end
