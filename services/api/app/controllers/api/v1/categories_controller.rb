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
        category = Category.transaction do
          record = household.categories.create!(category_params)
          Activities::Record.call(
            household:,
            actor: current_user,
            action: "inventory.category_created",
            subject: record,
            metadata: { itemName: record.name }
          )
          record
        end
        render json: { category: CategorySerializer.render(category) }, status: :created
      rescue ActiveRecord::RecordNotUnique
        duplicate_name!
      end

      def update
        household = find_household!
        category = household.categories.active.find(params[:id])
        Category.transaction do
          category.lock!
          category.update!(category_params)
          Activities::Record.call(
            household:,
            actor: current_user,
            action: "inventory.category_updated",
            subject: category,
            metadata: { itemName: category.name }
          )
        end
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
