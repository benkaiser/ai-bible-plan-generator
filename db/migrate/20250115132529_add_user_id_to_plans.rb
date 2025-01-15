class AddUserIdToPlans < ActiveRecord::Migration[8.0]
  def change
    add_reference :plans, :user, null: false, foreign_key: true
  end
end
