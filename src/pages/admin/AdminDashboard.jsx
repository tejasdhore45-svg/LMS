// ======================================================
// LIBRARY MANAGEMENT SYSTEM - ADMIN DASHBOARD
// ======================================================

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  ArrowRight,
  BookOpen,
  BookPlus,
  BookCheck,
  Users,
  ClipboardList,
  Clock3,
  RefreshCw,
} from "lucide-react";

import StatCard from "../../components/Statcard";

import "./AdminDashboard.css";

// ======================================================
// LOCAL STORAGE KEYS
// ======================================================

const BOOKS_KEY = "lms_books";
const STUDENTS_KEY = "lms_students";
const ISSUES_KEY = "lms_issues";

// ======================================================
// READ DATA SAFELY
// ======================================================

// Read an array from localStorage.
// Return an empty array if the data is missing or invalid.

function readStoredArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error reading ${key}:`, error);

    return [];
  }
}

// ======================================================
// DATE HELPERS
// ======================================================

// Convert a date into YYYY-MM-DD using local time.

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ======================================================
// CALCULATE DASHBOARD DATA
// ======================================================

function getDashboardData() {
  const books = readStoredArray(BOOKS_KEY);
  const students = readStoredArray(STUDENTS_KEY);
  const issues = readStoredArray(ISSUES_KEY);

  const today = getToday();

  // Total physical book copies in the library
  const totalBooks = books.reduce(
    (total, book) =>
      total + Number(book.totalCopies || 0),
    0
  );

  // Copies currently available for borrowing
  const availableBooks = books.reduce(
    (total, book) =>
      total + Number(book.availableCopies || 0),
    0
  );

  // Active issue records
  const activeIssues = issues.filter(
    (issue) => issue.status === "Issued"
  );

  // Copies currently borrowed
  const issuedBooks = activeIssues.length;

  // Active issues with due dates before today
  const overdueBooks = activeIssues.filter(
    (issue) => issue.dueDate && issue.dueDate < today
  ).length;

  // Registered students
  const totalStudents = students.length;

  // Number of completed returns
  const returnedBooks = issues.filter(
    (issue) => issue.status === "Returned"
  ).length;

  // Show latest transactions using issue/return dates.
  // This is a summary of current issue records, not a
  // complete event-by-event audit history.
  const recentTransactions = [...issues]
    .sort((a, b) => {
      const dateA =
        a.status === "Returned"
          ? a.returnDate || a.issueDate
          : a.issueDate;

      const dateB =
        b.status === "Returned"
          ? b.returnDate || b.issueDate
          : b.issueDate;

      return String(dateB || "").localeCompare(
        String(dateA || "")
      );
    })
    .slice(0, 6);

  return {
    totalBooks,
    availableBooks,
    issuedBooks,
    overdueBooks,
    totalStudents,
    returnedBooks,
    recentTransactions,
  };
}

// ======================================================
// QUICK ACTIONS
// ======================================================

const quickActions = [
  {
    title: "Manage Books",
    description: "Add, edit, and organize books",
    path: "/admin/books",
    icon: BookOpen,
    theme: "blue",
  },
  {
    title: "Issue Book",
    description: "Issue a book to a student",
    path: "/admin/issue",
    icon: BookPlus,
    theme: "purple",
  },
  {
    title: "Return Book",
    description: "Process borrowed book returns",
    path: "/admin/return",
    icon: BookCheck,
    theme: "green",
  },
  {
    title: "Manage Students",
    description: "View and manage library members",
    path: "/admin/students",
    icon: Users,
    theme: "orange",
  },
];

// ======================================================
// ADMIN DASHBOARD COMPONENT
// ======================================================

function AdminDashboard() {
  const location = useLocation();

  // Store calculated dashboard data
  const [dashboardData, setDashboardData] = useState(
    getDashboardData
  );

  const [lastUpdated, setLastUpdated] = useState(
    new Date()
  );

  // ====================================================
  // REFRESH DASHBOARD DATA
  // ====================================================

  function refreshDashboard() {
    setDashboardData(getDashboardData());
    setLastUpdated(new Date());
  }

  // Refresh when returning to the Dashboard,
  // when another tab updates storage,
  // or when the browser window receives focus.

  useEffect(() => {
    function handleStorageChange(event) {
      if (
        event.key === null ||
        [BOOKS_KEY, STUDENTS_KEY, ISSUES_KEY].includes(
          event.key
        )
      ) {
        refreshDashboard();
      }
    }

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    window.addEventListener(
      "focus",
      refreshDashboard
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      window.removeEventListener(
        "focus",
        refreshDashboard
      );
    };
  }, []);

  // Refresh whenever this page is opened through routing.

  useEffect(() => {
    refreshDashboard();
  }, [location.key]);

  // ====================================================
  // STATISTICS CONFIGURATION
  // ====================================================

  const libraryStats = [
    {
      title: "Total Books",
      value: dashboardData.totalBooks,
      type: "totalBooks",
      description: "Total copies in the library",
    },
    {
      title: "Available Books",
      value: dashboardData.availableBooks,
      type: "availableBooks",
      description: "Ready to borrow",
    },
    {
      title: "Issued Books",
      value: dashboardData.issuedBooks,
      type: "issuedBooks",
      description: "Currently borrowed copies",
    },
    {
      title: "Overdue Books",
      value: dashboardData.overdueBooks,
      type: "overdueBooks",
      description: "Returns past their due date",
    },
    {
      title: "Total Students",
      value: dashboardData.totalStudents,
      type: "totalStudents",
      description: "Registered library members",
    },
  ];

  // ====================================================
  // RETURN JSX
  // ====================================================

  return (
    <main className="dashboard-content">

      {/* ================= PAGE HEADER ================= */}

      <div className="dashboard-header">

        <div>
          <h1>Library Overview</h1>

          <p>
            Monitor library activity, books, and
            student records in one place.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh-btn"
          onClick={refreshDashboard}
        >
          <RefreshCw size={17} />

          <span>Refresh Data</span>
        </button>

      </div>

      {/* ================= STATISTICS ================= */}

      <section
        className="dashboard-section"
        aria-label="Library statistics"
      >

        <div className="dashboard-section-heading">
          <div>
            <h2>Library Statistics</h2>

            <p>
              Current overview of your library records
            </p>
          </div>
        </div>

        <div className="stats-container">

          {libraryStats.map((stat) => (
            <StatCard
              key={stat.type}
              title={stat.title}
              value={stat.value}
              type={stat.type}
              description={stat.description}
            />
          ))}

        </div>

      </section>

      {/* ================= LOWER DASHBOARD ================= */}

      <div className="dashboard-bottom-grid">

        {/* =============== RECENT TRANSACTIONS =============== */}

        <section className="dashboard-panel">

          <div className="dashboard-panel-header">

            <div>
              <h2>Recent Transactions</h2>

              <p>
                Latest book issue and return records
              </p>
            </div>

            <Link
              to="/admin/transactions"
              className="dashboard-view-all"
            >
              View All

              <ArrowRight size={16} />
            </Link>

          </div>

          {dashboardData.recentTransactions.length === 0 ? (

            <div className="dashboard-empty-state">

              <ClipboardList size={32} />

              <h3>No transactions yet</h3>

              <p>
                Book issue and return records will
                appear here once transactions begin.
              </p>

              <Link to="/admin/issue">
                Issue Your First Book
              </Link>

            </div>

          ) : (

            <div className="dashboard-table-wrapper">

              <table className="dashboard-table">

                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>

                  {dashboardData.recentTransactions.map(
                    (transaction, index) => {

                      const isReturned =
                        transaction.status === "Returned";

                      const isOverdue =
                        !isReturned &&
                        transaction.status === "Issued" &&
                        transaction.dueDate &&
                        transaction.dueDate < getToday();

                      const displayStatus = isReturned
                        ? "Returned"
                        : isOverdue
                        ? "Overdue"
                        : "Issued";

                      const displayDate = isReturned
                        ? transaction.returnDate ||
                          transaction.issueDate
                        : transaction.issueDate;

                      return (
                        <tr
                          key={
                            transaction.id ||
                            `transaction-${index}`
                          }
                        >

                          <td>
                            <span className="dashboard-book-name">
                              {transaction.bookTitle ||
                                "Unknown Book"}
                            </span>
                          </td>

                          <td>
                            {transaction.studentName ||
                              "Unknown Student"}
                          </td>

                          <td>
                            <span
                              className={`dashboard-status dashboard-status--${displayStatus.toLowerCase()}`}
                            >
                              {displayStatus}
                            </span>
                          </td>

                          <td>
                            {displayDate || "—"}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* ================= QUICK ACTIONS ================= */}

        <section className="dashboard-panel">

          <div className="dashboard-panel-header">

            <div>
              <h2>Quick Actions</h2>

              <p>
                Access important library operations
              </p>
            </div>

          </div>

          <div className="dashboard-actions">

            {quickActions.map((action) => {

              const Icon = action.icon;

              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="dashboard-action"
                >

                  <div
                    className={`dashboard-action-icon dashboard-action-icon--${action.theme}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="dashboard-action-text">
                    <h3>{action.title}</h3>

                    <p>{action.description}</p>
                  </div>

                  <ArrowRight
                    size={18}
                    className="dashboard-action-arrow"
                  />

                </Link>
              );
            })}

          </div>

        </section>

      </div>

      {/* ================= DASHBOARD FOOTER ================= */}

      <div className="dashboard-footer">

        <span>
          <Clock3 size={15} />

          Last refreshed:{" "}
          {lastUpdated.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <span>
          {dashboardData.returnedBooks.toLocaleString(
            "en-IN"
          )}{" "}
          completed returns
        </span>

      </div>

    </main>
  );
}

export default AdminDashboard;