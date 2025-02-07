class AddDefaultCoverPhotoToPlans < ActiveRecord::Migration[8.0]
  def change
    Plan.where(cover_photo: [nil, '']).update_all(cover_photo: 'https://picsum.photos/seed/7890')
  end
end
