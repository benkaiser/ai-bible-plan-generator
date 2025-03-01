class NotificationService
  def self.send_notifications
    NotificationSubscription.find_each do |subscription|
      user_time = Time.current.in_time_zone(subscription.user.timezone).strftime("%H:%M")
      if user_time == subscription.time
        WebPush.payload_send(
          message: { title: 'Daily Reminder', options: {} }.to_json,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          vapid: {
            subject: 'mailto:admin@aibibleplan.org',
            public_key: ENV['VAPID_PUBLIC_KEY'],
            private_key: ENV['VAPID_PRIVATE_KEY']
          }
        )
      end
    end
  end
end