class ApplicationMailer < ActionMailer::Base
  default from: ENV['SMTP_SENDER']
  layout "mailer"
end
