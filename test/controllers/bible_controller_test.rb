require "test_helper"

class BibleControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get bible_show_url
    assert_response :success
  end
end
