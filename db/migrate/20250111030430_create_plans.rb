class CreatePlans < ActiveRecord::Migration[8.0]
  def change
    create_table :plans do |t|
      t.string :name
      t.text :description
      t.string :cover_photo
      t.text :days

      t.timestamps
    end
  end
end
