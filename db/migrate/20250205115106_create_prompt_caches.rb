class CreatePromptCaches < ActiveRecord::Migration[8.0]
  def change
    create_table :prompt_caches do |t|
      t.string :key
      t.text :response

      t.timestamps
    end
  end
end
