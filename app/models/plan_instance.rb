class PlanInstance < ApplicationRecord
  belongs_to :plan
  has_many :plan_instance_users, dependent: :destroy
  has_many :users, through: :plan_instance_users
  has_many :plan_instance_comments, dependent: :destroy

  default_scope { where(deleted: false) }

  def soft_delete
    update(deleted: true)
  end

  def restore
    update(deleted: false)
  end
end
