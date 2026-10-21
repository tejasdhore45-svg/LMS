import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

const pageTitles = {
  "/admin/dashboard": "Dashboard",
  "/admin/books": "Manage Books",
  "/admin/issue": "Issue Book",
  "/admin/return": "Return Book",
  "/admin/students": "Manage Students",
  "/admin/transactions": "Transactions",
};

function AdminLayout() {
  const location = useLocation();

  // Controls sidebar on tablet/mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTitle =
    pageTitles[location.pathname] || "Library Management";

  // Open / close sidebar
  function toggleSidebar() {
    setSidebarOpen((previousState) => !previousState);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={closeSidebar}
      />

      {/* Dark background behind sidebar on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Main Application Area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Navbar
          pageTitle={currentTitle}
          toggleSidebar={toggleSidebar}
        />

        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;