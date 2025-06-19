class AddLlmFieldsToPromptCaches < ActiveRecord::Migration[8.0]
  def change
    add_column :prompt_caches, :llm_request, :text
    add_column :prompt_caches, :llm_model, :string
    add_column :prompt_caches, :llm_temperature, :decimal
    add_column :prompt_caches, :llm_max_tokens, :integer
    add_column :prompt_caches, :job_id, :string
  end
end
