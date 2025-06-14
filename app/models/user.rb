class User < ApplicationRecord
  has_many :plans, dependent: :nullify
  has_many :plan_instance_users, dependent: :destroy
  has_many :plan_instances, through: :plan_instance_users
  has_many :plan_instance_comments, dependent: :nullify
  has_many :notification_subscriptions, dependent: :destroy

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  validates :username, presence: true, uniqueness: true,
            format: { with: /\A[a-zA-Z0-9_]+\z/, message: "only allows letters, numbers and underscores" },
            length: { minimum: 3, maximum: 20 }

  # Add this method to update without password validation
  def update_without_password_validation(params)
    if params[:password].blank?
      params.delete(:password)
      params.delete(:password_confirmation) if params[:password_confirmation].blank?
      params.delete(:current_password)
      update_without_password(params)
    else
      update_with_password(params)
    end
  end

  def active_plan_instance_users
    plan_instance_users.joins(:plan_instance)
                       .where(completed: false, approved: true, removed: false, plan_instances: { deleted: false })
  end

  def completed_plan_instance_users
    plan_instance_users.joins(:plan_instance)
                       .where(completed: true, approved: true, removed: false, plan_instances: { deleted: false })
  end

  # Always remember the user
  def remember_me
    true
  end
end
