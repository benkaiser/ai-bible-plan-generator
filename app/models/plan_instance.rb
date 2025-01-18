class PlanInstance < ApplicationRecord
  belongs_to :plan
  has_many :plan_instance_users
  has_many :users, through: :plan_instance_users
  has_many :plan_instance_readings
  has_many :plan_instance_comments
end
