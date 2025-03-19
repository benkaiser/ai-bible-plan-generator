module PlansHelper
  def start_plan_split_button(plan)
    content_tag(:div, class: 'btn-group') do
      concat(
        link_to 'Start Plan', plan_instances_path(plan_id: plan.id), method: :post, class: 'btn btn-success', data: { 'turbo-method': :post }
      )
      concat(
        content_tag(:button, class: 'btn btn-success dropdown-toggle dropdown-toggle-split', 'data-bs-toggle': 'dropdown', 'aria-expanded': 'false', id: "startPlanDropdown#{plan.id}") do
          content_tag(:span, 'Toggle Dropdown', class: 'visually-hidden')
        end
      )
      concat(
        content_tag(:ul, class: 'dropdown-menu', 'aria-labelledby': "startPlanDropdown#{plan.id}") do
          concat(
            content_tag(:li) do
              link_to 'Start Plan Together', '#', class: 'dropdown-item start-with-others', 'data-bs-toggle': 'modal', 'data-bs-target': '#startWithOthersModal', 'data-plan-id': plan.id, 'data-plan-name': plan.name
            end
          )
        end
      )
    end
  end
end
