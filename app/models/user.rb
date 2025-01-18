class User < ApplicationRecord
  has_many :plans, dependent: :destroy
  has_many :plan_instance_users
  has_many :plan_instances, through: :plan_instance_users

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  def active_plan_instances
    plan_instances.joins(:plan_instance_users).where(plan_instance_users: { user_id: id, completed: false, approved: true, removed: false })
  end

  def completed_plan_instances
    plan_instances.joins(:plan_instance_users).where(plan_instance_users: { user_id: id, completed: true, approved: true, removed: false })
  end
end
