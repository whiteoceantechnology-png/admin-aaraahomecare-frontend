// Reusable empty-state block for cards/sections with no data to show.
const EmptyState = ({ icon: Icon, title = "Nothing to show", description }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
    {Icon && (
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon size={20} className="text-gray-400" />
      </div>
    )}
    <p className="text-sm font-medium text-gray-600">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
  </div>
);

export default EmptyState;
