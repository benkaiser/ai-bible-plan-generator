class NotificationService
  def self.send_notifications
    NotificationSubscription.where(removed: false).find_each do |subscription|
      if subscription.plan_instance_user.completed
        subscription.update(removed: true)
        next
      end
      user_time = Time.current.in_time_zone(subscription.user.timezone).strftime("%H:%M")
      if user_time == subscription.time
        title = subscription.plan_instance_user.plan_instance.plan.name
        body = "Jump into your daily reading!"
        image = subscription.plan_instance_user.plan_instance.plan.cover_photo + "/512/256"
        begin
          WebPush.payload_send(
            message: { title: title, options: {
              body: body,
              image: image,
              data: { path: "/plan_instances/#{subscription.plan_instance_user.plan_instance_id}" }
            } }.to_json,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            vapid: {
              subject: 'mailto:admin@aibibleplan.org',
              public_key: ENV['VAPID_PUBLIC_KEY'],
              private_key: ENV['VAPID_PRIVATE_KEY']
            }
          )
        rescue WebPush::ExpiredSubscription => e
          subscription.update(removed: true)
          Rails.logger.error("WebPush::ExpiredSubscription: #{e.message}")
        end
      end
    end
  end
end