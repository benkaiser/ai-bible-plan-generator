class HomeController < ApplicationController
  def index
    @community_plans = self.class.community_plans_cache
    render 'home/index'
  end
end
