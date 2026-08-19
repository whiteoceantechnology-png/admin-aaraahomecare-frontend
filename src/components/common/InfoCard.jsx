// Premium card wrapper used across detail pages: rounded corners, soft
// shadow, optional icon+title header.
const InfoCard = ({ title, icon: Icon, actions, children, className = "", id }) => (
  <div
    id={id}
    className={`bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300 p-3 animate-fade-in-up ${className}`}
  >
    {(title || actions) && (
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="flex items-center gap-2 text-[18px] font-semibold text-gray-900">
            {Icon && (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] shrink-0">
                <Icon size={16} />
              </span>
            )}
            {title}
          </h3>
        )}
        {actions}
      </div>
    )}
    {children}
  </div>
);

export default InfoCard;
