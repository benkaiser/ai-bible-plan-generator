class PlanInstanceUser < ApplicationRecord
  belongs_to :plan_instance
  belongs_to :user
  has_many :plan_instance_readings
  has_many :notification_subscriptions, dependent: :destroy

  validates :approved, inclusion: { in: [true, false] }
  validates :completed, inclusion: { in: [true, false] }
  validates :removed, inclusion: { in: [true, false] }

  def completion_percentage
    plan_days = plan_instance.plan.days
    total_readings = 0
    completed_readings = 0

    # Fetch all readings for this plan_instance_user in one query
    readings = plan_instance_readings.where(completed: true).pluck(:day_number, :reading_index).to_set

    plan_days.each do |day|
      total_readings += day['readings'].size + 1 # +1 for the overview
      completed_readings += 1 if readings.include?([day['day_number'], 0])
      day['readings'].each_with_index do |_, index|
        completed_readings += 1 if readings.include?([day['day_number'], index + 1])
      end
    end

    return 0 if total_readings == 0
    (completed_readings.to_f / total_readings * 100).round(2)
  end

  def has_notifications?
    notification_subscriptions.where(removed: false).exists?
  end
end
