module CategorySerializer
  module_function

  def render(category)
    {
      id: category.id,
      name: category.name,
      position: category.position,
      archivedAt: category.archived_at&.iso8601,
      createdAt: category.created_at.iso8601,
      updatedAt: category.updated_at.iso8601
    }
  end
end
