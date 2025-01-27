Rails.application.routes.draw do
  devise_for :users
  root 'home#index'

  resources :plans, only: [:index, :show, :new, :create, :show, :edit, :update]
  resources :plan_instances, only: [:create, :show, :destroy] do
    member do
      patch :update_reading_status
      patch :update_plan_status
      post :day_overview
    end
  end

  # API routes
  post 'api/generate_plan', to: 'plans#generate_plan'

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get 'up' => 'rails/health#show', as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get 'manifest' => 'rails/pwa#manifest', as: :pwa_manifest
  # get 'service-worker' => 'rails/pwa#service_worker', as: :pwa_service_worker

  # Defines the root path route ("/")
  # root 'posts#index'
end
