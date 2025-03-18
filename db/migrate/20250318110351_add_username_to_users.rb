class AddUsernameToUsers < ActiveRecord::Migration[8.0]
  def up
    add_column :users, :username, :string

    # Populate existing users with usernames based on their id
    execute <<-SQL
      UPDATE users
      SET username = CONCAT('user', id)
    SQL

    add_index :users, :username, unique: true
  end

  def down
    remove_column :users, :username
  end
end
