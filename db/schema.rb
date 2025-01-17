# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_01_17_110753) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "plan_instance_comments", force: :cascade do |t|
    t.bigint "plan_instance_id", null: false
    t.integer "day_number"
    t.bigint "user_id", null: false
    t.text "comment"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["plan_instance_id"], name: "index_plan_instance_comments_on_plan_instance_id"
    t.index ["user_id"], name: "index_plan_instance_comments_on_user_id"
  end

  create_table "plan_instance_readings", force: :cascade do |t|
    t.bigint "plan_instance_id", null: false
    t.integer "day_number"
    t.integer "reading_index"
    t.boolean "completed"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["plan_instance_id"], name: "index_plan_instance_readings_on_plan_instance_id"
  end

  create_table "plan_instance_users", force: :cascade do |t|
    t.bigint "plan_instance_id", null: false
    t.bigint "user_id", null: false
    t.boolean "approved"
    t.boolean "creator"
    t.boolean "completed"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["plan_instance_id"], name: "index_plan_instance_users_on_plan_instance_id"
    t.index ["user_id"], name: "index_plan_instance_users_on_user_id"
  end

  create_table "plan_instances", force: :cascade do |t|
    t.bigint "plan_id", null: false
    t.date "start_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["plan_id"], name: "index_plan_instances_on_plan_id"
  end

  create_table "plans", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.string "cover_photo"
    t.text "days"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_plans_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "plan_instance_comments", "plan_instances"
  add_foreign_key "plan_instance_comments", "users"
  add_foreign_key "plan_instance_readings", "plan_instances"
  add_foreign_key "plan_instance_users", "plan_instances"
  add_foreign_key "plan_instance_users", "users"
  add_foreign_key "plan_instances", "plans"
  add_foreign_key "plans", "users"
end
