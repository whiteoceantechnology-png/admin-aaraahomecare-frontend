// Reusable breadcrumb trail: Dashboard > Section > Current Page.
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const Breadcrumb = ({ items = [] }) => (
  <nav className="flex items-center flex-wrap gap-1.5 text-sm">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <span key={index} className="flex items-center gap-1.5">
          {item.to && !isLast ? (
            <Link
              to={item.to}
              className="text-gray-500 hover:text-[var(--brand-purple)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={isLast ? "font-medium text-gray-800" : "text-gray-500"}>
              {item.label}
            </span>
          )}
          {!isLast && <ChevronRight size={14} className="text-gray-300" />}
        </span>
      );
    })}
  </nav>
);

export default Breadcrumb;
