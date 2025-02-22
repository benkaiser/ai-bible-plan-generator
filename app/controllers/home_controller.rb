class HomeController < ApplicationController
  def index
    system_keys = [
      "Overcoming Anxiety",
      "Balancing Work and Faith",
      "Financial Wisdom",
      "Divine Interventions",
      "Mental Health and Faith",
      "Building Strong Relationships"
    ]
    @community_plans = Plan.where(system_key: system_keys)
    @community_plans = @community_plans.sort_by { |plan| system_keys.index(plan.system_key) }
    render 'home/index'
  end
end
