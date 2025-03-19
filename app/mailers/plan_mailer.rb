class PlanMailer < ApplicationMailer
  def invitation_email(invited_user, inviting_user, plan_instance)
    @invited_user = invited_user
    @inviting_user = inviting_user
    @plan_instance = plan_instance
    @plan = plan_instance.plan
    @plan_instance_user = PlanInstanceUser.find_by(
      plan_instance: plan_instance,
      user: invited_user
    )

    # Generate a URL with the plan_instance_user ID that the user can click to confirm
    @confirmation_url = confirm_plan_participation_url(
      plan_instance_user_id: @plan_instance_user.id
    )

    mail(
      to: @invited_user.email,
      subject: "#{@inviting_user.username} has invited you to join a Bible reading plan"
    )
  end
end
