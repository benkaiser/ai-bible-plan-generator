Rails.application.routes.draw do
  devise_for :users
  root 'home#index'

  get 'bible(/:book(/:chapter))', to: 'bible#show', as: 'bible'

  authenticate do
    resources :plans, only: [:index, :show, :new, :create, :edit, :update]
    get 'completed_plans', to: 'plans#completed', as: 'completed_plans'
    resources :plan_instances, only: [:create, :show, :destroy] do
      member do
        patch :update_reading_status
        patch :update_plan_status
        post :day_overview
      end
    end

    # API routes
    post 'api/generate_plan', to: 'plans#generate_plan'
    post 'api/fix_reading', to: 'plans#fix_reading'
    post 'notification_subscriptions', to: 'notification_subscriptions#create'
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
