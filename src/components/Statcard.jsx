// ======================================================
// LIBRARY MANAGEMENT SYSTEM - STATISTICS CARD COMPONENT
// ======================================================

// Import icons from Lucide React
import {
  BookOpen,
  BookCheck,
  BookMarked,
  ClockAlert,
  Users,
} from "lucide-react";

// Import component styling
import "./StatCard.css";

// ======================================================
// ICON CONFIGURATION
// ======================================================

// Each card type has its own icon and color theme.
// This keeps our component reusable and easy to maintain.

const cardConfig = {
  totalBooks: {
    icon: BookOpen,
    theme: "blue",
  },

  availableBooks: {
    icon: BookCheck,
    theme: "green",
  },

  issuedBooks: {
    icon: BookMarked,
    theme: "purple",
  },

  overdueBooks: {
    icon: ClockAlert,
    theme: "red",
  },

  totalStudents: {
    icon: Users,
    theme: "orange",
  },
};

// ======================================================
// STAT CARD COMPONENT
// ======================================================

// Props:
// title = Name of the statistic
// value = Number displayed on the card
// type = Determines the icon and color
// description = Optional information below the value

function StatCard({
  title,
  value = 0,
  type = "totalBooks",
  description,
}) {
  // Select the card configuration based on its type.
  // If an invalid type is provided, use totalBooks.

  const config = cardConfig[type] || cardConfig.totalBooks;

  // Store the selected icon as a React component
  const Icon = config.icon;

  return (
    <div className={`stat-card stat-card--${config.theme}`}>

      {/* ================= TOP SECTION ================= */}

      <div className="stat-card-top">

        {/* Statistics title */}
        <p className="stat-card-title">{title}</p>

        {/* Icon with background color */}
        <div className="stat-card-icon">
          <Icon size={22} strokeWidth={2} />
        </div>

      </div>

      {/* ================= MAIN STATISTIC ================= */}

      <div className="stat-card-content">

        {/* Display the statistic value */}
        <h2 className="stat-card-value">
          {typeof value === "number"
            ? value.toLocaleString("en-IN")
            : value}
        </h2>

        {/* Display description only when provided */}
        {description && (
          <p className="stat-card-description">
            {description}
          </p>
        )}

      </div>

      {/* Decorative bottom accent */}
      <div className="stat-card-accent"></div>

    </div>
  );
}

export default StatCard;