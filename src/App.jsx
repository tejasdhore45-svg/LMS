// ======================================================
// LIBRARY MANAGEMENT SYSTEM - MAIN APPLICATION
// ======================================================

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Shared Admin Layout
import AdminLayout from "./pages/admin/AdminLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageBooks from "./pages/admin/ManageBooks";
import IssueBook from "./pages/admin/IssueBook";
import ReturnBook from "./pages/admin/ReturnBook";
import ManageStudent from "./pages/admin/ManageStudent";
import Transaction from "./pages/admin/Transaction";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default Route */}
        <Route
          path="/"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        {/* Shared Admin Layout */}
        <Route path="/admin" element={<AdminLayout />}>

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="books"
            element={<ManageBooks />}
          />

          <Route
            path="issue"
            element={<IssueBook />}
          />

          <Route
            path="return"
            element={<ReturnBook />}
          />

          <Route
            path="students"
            element={<ManageStudent />}
          />

          <Route
            path="transactions"
            element={<Transaction />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;