Rails.application.routes.draw do
  devise_for :users, controllers: {
    registrations: 'users/registrations'
  }

  # Add the devise_scope block for the username check route
  devise_scope :user do
    post '/users/check_username', to: 'users/registrations#check_username'
  end

  root 'home#index'

  get 'bible(/:book(/:chapter))', to: 'bible#show', as: 'bible'

  authenticate do
    resources :plans, only: [:index, :show, :new, :create, :edit, :update, :destroy]
    get 'completed_plans', to: 'plans#completed', as: 'completed_plans'
    resources :plan_instances, only: [:create, :show, :destroy] do
      member do
        patch :update_reading_status
        patch :update_plan_status
        post :day_overview
        post :get_daily_reading_tts
        get :members
        post :invite_user
        get :confirm_participation
        get :decline_invitation
      end
    end

    # API routes
    post 'api/generate_plan', to: 'plans#generate_plan'
    post 'api/fix_reading', to: 'plans#fix_reading'
    post 'notification_subscriptions', to: 'notification_subscriptions#create'
    delete 'notification_subscriptions', to: 'notification_subscriptions#destroy'
    # Add the route for confirming plan participation
    get '/plan_instances/:plan_instance_user_id/confirm_participation', to: 'plan_instances#confirm_participation', as: 'confirm_plan_participation'
    post 'confirm_participation', to: 'plan_instances#confirm_participation'
    post 'decline_invitation', to: 'plan_instances#decline_invitation'
  end

  unauthenticated do
    resources :plans, only: [:show]
  end

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get 'up' => 'rails/health#show', as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get 'manifest' => 'rails/pwa#manifest', as: :pwa_manifest
  get 'service-worker' => 'rails/pwa#service_worker', as: :pwa_service_worker

  # Defines the root path route ("/")
  # root 'posts#index'
end
