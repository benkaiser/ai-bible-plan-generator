class HomeController < ApplicationController
  def index
    if user_signed_in?
      redirect_to plans_path
    else
      render 'home/index'
    end
  end
end
