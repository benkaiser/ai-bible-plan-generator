class PlanInstanceUser < ApplicationRecord
  belongs_to :plan_instance
  belongs_to :user
  has_many :plan_instance_readings

  validates :approved, inclusion: { in: [true, false] }
  validates :completed, inclusion: { in: [true, false] }
  validates :removed, inclusion: { in: [true, false] }
end
