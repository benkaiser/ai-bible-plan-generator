require 'rufus-scheduler'

scheduler = Rufus::Scheduler.new

if Rails.env.development?
  scheduler.in '1s' do
    NotificationService.send_notifications
  end
end

scheduler.every '1m' do
  NotificationService.send_notifications
end