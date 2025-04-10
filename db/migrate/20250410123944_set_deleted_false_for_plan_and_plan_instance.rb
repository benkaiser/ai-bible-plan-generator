class SetDeletedFalseForPlanAndPlanInstance < ActiveRecord::Migration[8.0]
  def up
    # Use execute to bypass any default scopes and update all records
    execute("UPDATE plans SET deleted = FALSE WHERE deleted IS NULL")
    execute("UPDATE plan_instances SET deleted = FALSE WHERE deleted IS NULL")
    change_column_default :plans, :deleted, false
    change_column_default :plan_instances, :deleted, false
    change_column_null :plans, :deleted, false
    change_column_null :plan_instances, :deleted, false
  end

  def down
  end
end
