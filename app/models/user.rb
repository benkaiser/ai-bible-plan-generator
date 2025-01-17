class User < ApplicationRecord
  has_many :plans, dependent: :destroy
  has_many :plan_instance_users
  has_many :plan_instances, through: :plan_instance_users

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
end
