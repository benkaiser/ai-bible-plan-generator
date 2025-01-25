class AddTimezoneToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :timezone, :string

    # Update all existing users' timezones to "Australia/Brisbane"
    reversible do |dir|
      dir.up do
        User.update_all(timezone: "Australia/Brisbane")
      end
    end
  end
end
