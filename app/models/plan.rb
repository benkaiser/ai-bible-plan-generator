class Plan < ApplicationRecord
  serialize :days, coder: JSON

  validates :name, presence: true
  validates :description, presence: true
  validates :cover_photo, presence: true
  validate :validate_days_structure

  private

  def validate_days_structure
    return if days.blank?

    unless days.is_a?(Array)
      errors.add(:days, 'must be an array')
      return
    end

    days.each do |day|
      unless day.is_a?(Hash) && day.key?('description') && day.key?('readings')
        errors.add(:days, 'each day must be a hash with description and readings keys')
        return
      end

      unless day['readings'].is_a?(Array)
        errors.add(:days, 'readings must be an array')
        return
      end

      day['readings'].each do |reading|
        unless reading.is_a?(Hash) && reading.key?('book') && reading.key?('chapter') && (reading.key?('verse_range') || reading.key?('whole_chapter'))
          errors.add(:days, 'each reading must be a hash with book, chapter, and either verse_range or whole_chapter keys')
        end
      end
    end
  end
end