module Api
  module V1
    class CategoriesController < BaseController
      before_action :authenticate_user!

      def index
        household = find_household!
        categories = household.categories.active.order(:position, :name)
        render json: { categories: categories.map { |category| CategorySerializer.render(category) } }
      end

      def create
        household = find_household!
        category = household.categories.create!(category_params)
        render json: { category: CategorySerializer.render(category) }, status: :created
      rescue ActiveRecord::RecordNotUnique
        duplicate_name!
      end

      def update
        household = find_household!
        category = household.categories.active.find(params[:id])
        category.update!(category_params)
        render json: { category: CategorySerializer.render(category) }
      rescue ActiveRecord::RecordNotUnique
        duplicate_name!
      end

      private

      def category_params
        params.require(:category).permit(:name, :position)
      end

      def duplicate_name!
        raise DomainError.new(
          code: "inventory.category_name_taken",
          message: "That category already exists in this household.",
          status: :conflict
        )
      end
    end
  end
end
