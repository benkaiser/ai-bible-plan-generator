class NotificationSubscription < ApplicationRecord
  belongs_to :user
  belongs_to :plan_instance_user

  validates :endpoint, presence: true
  validates :p256dh, presence: true
  validates :auth, presence: true
  validates :time, presence: true
end