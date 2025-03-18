class Users::RegistrationsController < Devise::RegistrationsController
  # Add this before_action for the new check_username method
  skip_before_action :verify_authenticity_token, only: [:check_username]

  # Add this new method to check username availability
  def check_username
    username = params[:username]
    user_exists = User.where("lower(username) = ?", username.downcase).exists?

    if username.blank?
      render json: { valid: false, message: "Username cannot be blank" }
    elsif user_exists && username.downcase != current_user&.username&.downcase
      render json: { valid: false, message: "Username is already taken" }
    else
      render json: { valid: true }
    end
  end

  protected

  def after_update_path_for(resource)
    edit_user_registration_path # Change this to the path you want
  end

  def update_resource(resource, params)
    resource.update_without_password_validation(params)
  end
end
