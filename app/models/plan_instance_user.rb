class PlanInstanceUser < ApplicationRecord
  belongs_to :plan_instance
  belongs_to :user
end
