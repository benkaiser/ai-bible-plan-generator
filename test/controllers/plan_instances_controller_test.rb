require "test_helper"

class PlanInstancesControllerTest < ActionDispatch::IntegrationTest
  test "should get create" do
    get plan_instances_create_url
    assert_response :success
  end
end
