class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?

  @@community_plans_cache = nil

  def self.community_plans_cache
    system_keys = [
      "Overcoming Anxiety",
      "Balancing Work and Faith",
      "Financial Wisdom",
      "Divine Interventions",
      "Mental Health and Faith",
      "Building Strong Relationships"
    ]
    unless @@community_plans_cache
      @@community_plans_cache = Plan.where(system_key: system_keys)
      @@community_plans_cache = @@community_plans_cache.sort_by { |plan| system_keys.index(plan.system_key) }
    end
    @@community_plans_cache
  end

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:timezone, :username])
    devise_parameter_sanitizer.permit(:account_update, keys: [:timezone, :username])
  end
end
