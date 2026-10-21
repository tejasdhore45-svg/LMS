// ======================================================
// LIBRARY MANAGEMENT SYSTEM - ADMIN SIDEBAR
// ======================================================

import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  BookOpen,
  BookPlus,
  BookCheck,
  Users,
  ClipboardList,
  LogOut,
  LibraryBig,
  X,
} from "lucide-react";

import "./Sidebar.css";

// ======================================================
// SIDEBAR NAVIGATION ITEMS
// ======================================================

const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Manage Books",
    path: "/admin/books",
    icon: BookOpen,
  },
  {
    label: "Issue Book",
    path: "/admin/issue",
    icon: BookPlus,
  },
  {
    label: "Return Book",
    path: "/admin/return",
    icon: BookCheck,
  },
  {
    label: "Manage Students",
    path: "/admin/students",
    icon: Users,
  },
  {
    label: "Transactions",
    path: "/admin/transactions",
    icon: ClipboardList,
  },
];

// ======================================================
// SIDEBAR COMPONENT
// ======================================================

function Sidebar({ isOpen, closeSidebar }) {
  return (
    <aside
      className={`lms-sidebar ${
        isOpen ? "sidebar-open" : ""
      }`}
    >
      {/* ================= BRAND ================= */}

      <div className="sidebar-brand">

        <div className="brand-icon">
          <LibraryBig size={26} strokeWidth={2} />
        </div>

        <div className="brand-text">
          <h2>LibraryMS</h2>
          <p>Management System</p>
        </div>

        {/* Mobile Close Button */}

        <button
          type="button"
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        >
          <X size={21} />
        </button>

      </div>

      {/* ================= NAVIGATION ================= */}

      <div className="sidebar-navigation">

        <p className="sidebar-section-title">
          MAIN MENU
        </p>

        <nav
          className="sidebar-menu"
          aria-label="Admin navigation"
        >

          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}

                onClick={closeSidebar}

                className={({ isActive }) =>
                  isActive
                    ? "sidebar-link active"
                    : "sidebar-link"
                }
              >
                <Icon
                  size={20}
                  strokeWidth={1.9}
                />

                <span>{item.label}</span>
              </NavLink>
            );
          })}

        </nav>

      </div>

      {/* ================= BOTTOM ================= */}

      <div className="sidebar-bottom">

        <div className="sidebar-profile">

          <div className="profile-avatar">
            AD
          </div>

          <div className="profile-details">
            <h4>Library Admin</h4>
            <p>Administrator</p>
          </div>

        </div>

        <NavLink
          to="/login"
          className="sidebar-logout"
          onClick={closeSidebar}
        >
          <LogOut size={19} />

          <span>Logout</span>
        </NavLink>

      </div>

    </aside>
  );
}

export default Sidebar;