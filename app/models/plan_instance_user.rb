class PlanInstanceUser < ApplicationRecord
  belongs_to :plan_instance
  belongs_to :user

  validates :approved, inclusion: { in: [true, false] }
  validates :completed, inclusion: { in: [true, false] }
  validates :removed, inclusion: { in: [true, false] }
end
