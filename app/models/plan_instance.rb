class PlanInstance < ApplicationRecord
  belongs_to :plan
  has_many :plan_instance_users, dependent: :destroy
  has_many :users, through: :plan_instance_users
  has_many :plan_instance_comments

  validates :visibility, inclusion: { in: ['public', 'private'] }
  validates :slug, uniqueness: true, allow_nil: true,
            format: { with: /\A[a-z0-9\-_]+\z/, message: "only allows lowercase letters, numbers, hyphens and underscores" },
            length: { minimum: 3, maximum: 50 }, if: -> { slug.present? }

  default_scope { where(deleted: false) }

  def soft_delete
    update(deleted: true)
  end

  def restore
    update(deleted: false)
  end

  # Check if slug is available
  def self.slug_available?(slug)
    !exists?(slug: slug)
  end
end
