// ======================================================
// LIBRARY MANAGEMENT SYSTEM - NAVBAR / GLOBAL SEARCH
// ======================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, Menu, X, BookOpen, Users, ClipboardList } from "lucide-react";
import "./Navbar.css";

const BOOKS_KEY = "lms_books";
const STUDENTS_KEY = "lms_students";
const ISSUES_KEY = "lms_issues";

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const text = (value) => String(value ?? "");

function Navbar({ pageTitle = "Dashboard", toggleSidebar }) {
  const navigate = useNavigate();
  const searchContainer = useRef(null);
  const searchInput = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [data, setData] = useState(() => ({
    books: readArray(BOOKS_KEY),
    students: readArray(STUDENTS_KEY),
    issues: readArray(ISSUES_KEY),
  }));

  function refreshData() {
    setData({
      books: readArray(BOOKS_KEY),
      students: readArray(STUDENTS_KEY),
      issues: readArray(ISSUES_KEY),
    });
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (searchContainer.current && !searchContainer.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("focus", refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const match = (...fields) => fields.some((field) => text(field).toLowerCase().includes(query));
    const books = data.books.filter((book) => match(book.title, book.author, book.isbn, book.category)).map((book) => ({
      key: `book-${book.id}`, type: "Book", title: text(book.title) || "Untitled book",
      detail: `ISBN: ${text(book.isbn) || "N/A"} · ${text(book.availableCopies)} available`,
      path: "/admin/books", icon: BookOpen,
    }));
    const students = data.students.filter((student) => match(student.id, student.name, student.email, student.department)).map((student) => ({
      key: `student-${student.id}`, type: "Student", title: text(student.name) || "Unnamed student",
      detail: `ID: ${text(student.id)} · ${text(student.status)}`, path: "/admin/students", icon: Users,
    }));
    const issues = data.issues.filter((issue) => {
      const status = issue.status === "Issued" && issue.dueDate && issue.dueDate < localToday() ? "Overdue" : issue.status;
      return match(issue.id, issue.studentName, issue.studentId, issue.bookTitle, issue.isbn, status);
    }).map((issue) => ({
      key: `issue-${issue.id}`, type: "Transaction", title: text(issue.bookTitle) || "Untitled book",
      detail: `${text(issue.studentName)} · ${text(issue.status)}`, path: "/admin/transactions", icon: ClipboardList,
    }));
    return [...books, ...students, ...issues].slice(0, 8);
  }, [data, searchQuery]);

  function selectResult(result) {
    setSearchQuery("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(result.path);
  }

  const overdueCount = data.issues.filter((issue) => issue.status === "Issued" && issue.dueDate && issue.dueDate < localToday()).length;

  return (
    <header className="lms-navbar">
      <div className="navbar-left">
        <button type="button" className="navbar-menu-btn" onClick={toggleSidebar} aria-label="Open navigation menu">
          <Menu size={22} />
        </button>
        <div className="navbar-heading">
          <h1>{pageTitle}</h1>
          <p>Welcome back! Here's what's happening in your library.</p>
        </div>
      </div>

      <div className="navbar-right">
        <button type="button" className="navbar-mobile-search-btn" aria-label={mobileSearchOpen ? "Close search" : "Open search"} onClick={() => {
          setMobileSearchOpen((previous) => !previous);
          refreshData();
          setTimeout(() => searchInput.current?.focus(), 0);
        }}>
          {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
        </button>

        <div ref={searchContainer} className={`navbar-search-container ${mobileSearchOpen ? "mobile-open" : ""}`}>
          <div className="navbar-search">
            <Search size={19} className="search-icon" />
            <input ref={searchInput} type="search" placeholder="Search library..." aria-label="Search books, students and transactions" aria-expanded={searchOpen && Boolean(searchQuery.trim())} aria-controls="navbar-search-results" value={searchQuery} onFocus={() => { refreshData(); setSearchOpen(true); }} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }} />
            {searchQuery && <button type="button" className="navbar-clear-search" aria-label="Clear search" onClick={() => { setSearchQuery(""); searchInput.current?.focus(); }}><X size={15} /></button>}
          </div>
          {searchOpen && searchQuery.trim() && (
            <div id="navbar-search-results" className="navbar-search-dropdown" role="region" aria-label="Global search results">
              <div className="navbar-results-heading">Search results</div>
              {results.length ? results.map((result) => {
                const Icon = result.icon;
                return (
                  <button type="button" key={result.key} className="navbar-search-result" onClick={() => selectResult(result)}>
                    <span className="navbar-result-icon"><Icon size={17} /></span>
                    <span className="navbar-result-text"><strong>{result.title}</strong><small>{result.detail}</small></span>
                    <span className="navbar-result-type">{result.type}</span>
                  </button>
                );
              }) : <p className="navbar-search-empty">No matching books, students or transactions.</p>}
              <p className="navbar-search-hint">Select a result to open its section.</p>
            </div>
          )}
        </div>

        <button type="button" className="navbar-notification" aria-label={`${overdueCount} overdue book${overdueCount === 1 ? "" : "s"}. View transactions`} title={`${overdueCount} overdue books — view transactions`} onClick={() => navigate("/admin/transactions")}>
          <Bell size={20} />
          {overdueCount > 0 && <span className="notification-dot" />}
        </button>

        <div className="navbar-profile" aria-label="Library administrator">
          <div className="navbar-avatar">AD</div>
          <div className="navbar-user-info"><h4>Library Admin</h4><p>Administrator</p></div>
          <ChevronDown size={16} className="profile-chevron" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
