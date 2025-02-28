class NotificationService
  def self.send_notifications
    NotificationSubscription.find_each do |subscription|
      user_time = Time.current.in_time_zone(subscription.user.timezone).strftime("%H:%M")
      if user_time == subscription.time
        Webpush.payload_send(
          message: 'Your daily notification',
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          vapid: {
            subject: 'mailto:your-email@example.com',
            public_key: ENV['VAPID_PUBLIC_KEY'],
            private_key: ENV['VAPID_PRIVATE_KEY']
          }
        )
      end
    end
  end
end