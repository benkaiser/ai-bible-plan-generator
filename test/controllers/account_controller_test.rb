require "test_helper"

class AccountControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get account_show_url
    assert_response :success
  end
end
