# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

require 'csv'
require 'activerecord-import/base'
require 'json'

headers = ['number', 'chapterNumber', 'bookId', 'text']

if ChapterVerse.count == 0
  chapter_verses = []

  CSV.foreach(Rails.root.join('db/seeds/verses_only.csv'), headers: headers) do |row|
    chapter_verses << ChapterVerse.new(
      number: row['number'],
      chapterNumber: row['chapterNumber'],
      bookId: row['bookId'],
      text: row['text']
    )
  end

  ChapterVerse.import(chapter_verses)
end

# Ensure a system user exists
system_user = User.find_or_create_by!(email: 'system@example.com') do |user|
  user.password = SecureRandom.hex(16)
end

# Load traditional plans
traditional_plans_dir = File.join(Rails.root, 'db', 'traditional_plans')
if Dir.exist?(traditional_plans_dir)
  Dir.glob(File.join(traditional_plans_dir, '*.json')).each do |plan_file|
    plan_data = JSON.parse(File.read(plan_file))
    next if Plan.exists?(system_key: plan_data['system_key'])
    Plan.create!(
      name: plan_data['name'],
      system_key: plan_data['system_key'],
      description: plan_data['description'],
      cover_photo: plan_data['cover_photo'],
      days: plan_data['days'],
      user_id: system_user.id
    )
  end
end

# Load community plans
community_plans_dir = File.join(Rails.root, 'db', 'community_plans')
if Dir.exist?(community_plans_dir)
  Dir.glob(File.join(community_plans_dir, '*.json')).each do |plan_file|
    plan_data = JSON.parse(File.read(plan_file))
    next if Plan.exists?(system_key: plan_data['system_key'])
    Plan.create!(
      name: plan_data['name'],
      system_key: plan_data['system_key'],
      description: plan_data['description'],
      cover_photo: plan_data['cover_photo'],
      days: plan_data['days'],
      user_id: system_user.id
    )
  end
end
