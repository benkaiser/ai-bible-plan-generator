class CreateChapterVerses < ActiveRecord::Migration[8.0]
  def change
    create_table :chapter_verses do |t|
      t.integer :number
      t.integer :chapterNumber
      t.string :bookId
      t.text :text

      t.timestamps
    end
  end
end
