class Plan < ApplicationRecord
  belongs_to :user
  has_many :plan_instances, dependent: :destroy
  serialize :days, coder: JSON

  default_scope { where(deleted: false) }

  def soft_delete
    update(deleted: true)
  end

  def restore
    update(deleted: false)
  end

  validates :name, presence: true
  validates :description, presence: true
  validates :cover_photo, presence: true, allow_blank: true
  validate :validate_days_structure

  private

  def validate_days_structure
    return if days.blank?

    unless days.is_a?(Array)
      errors.add(:days, 'must be an array')
      return
    end

    days.each do |day|
      unless day.is_a?(Hash) && day.key?('outline') && day.key?('readings')
        errors.add(:days, 'each day must be a hash with outline and readings keys')
        return
      end

      unless day['readings'].is_a?(Array)
        errors.add(:days, 'readings must be an array')
        return
      end

      day['readings'].each do |reading|
        unless reading.is_a?(Hash) && reading.key?('book') && reading.key?('chapter')
          errors.add(:days, 'each reading must be a hash with book, chapter')
        end
      end
    end
  end
end