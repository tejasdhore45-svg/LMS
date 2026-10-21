// ======================================================
// LIBRARY MANAGEMENT SYSTEM - ISSUE BOOK (FRONTEND)
// ======================================================
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Search, X, BookOpen, CalendarDays,
  Clock, AlertTriangle, BookMarked, Users, RefreshCw,
} from "lucide-react";
import "./IssueBook.css";

const BOOKS_KEY = "lms_books";
const ISSUES_KEY = "lms_issues";
const STUDENTS_KEY = "lms_students";

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function blankForm() {
  return { studentId: "", bookId: "", issueDate: todayLocal(), dueDate: "" };
}

const isActive = (student) =>
  String(student.status || "").trim().toLowerCase() === "active";

function IssueBook() {
  const [books, setBooks] = useState(() => readArray(BOOKS_KEY));
  const [students, setStudents] = useState(() => readArray(STUDENTS_KEY));
  const [issues, setIssues] = useState(() => readArray(ISSUES_KEY));
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(blankForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const modalRef = useRef(null);
  const studentSelectRef = useRef(null);
  const openerRef = useRef(null);

  function refreshData() {
    setBooks(readArray(BOOKS_KEY));
    setStudents(readArray(STUDENTS_KEY));
    setIssues(readArray(ISSUES_KEY));
  }

  useEffect(() => {
    function onStorage(event) {
      if (!event.key || [BOOKS_KEY, ISSUES_KEY, STUDENTS_KEY].includes(event.key)) {
        refreshData();
      }
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshData);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshData);
    };
  }, []);

  function openModal() {
    refreshData();
    setFormData(blankForm());
    setError("");
    setNotice("");
    openerRef.current = document.activeElement;
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setError("");
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  useEffect(() => {
    if (!showModal) return;
    studentSelectRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusables = Array.from(modalRef.current.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]'
      ));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showModal, saving]);

  function changeField(event) {
    const { name, value } = event.target;
    setFormData((old) => ({
      ...old,
      [name]: value,
      ...(name === "issueDate" && old.dueDate && old.dueDate < value ? { dueDate: "" } : {}),
    }));
    setError("");
  }

  function handleIssueBook(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      // Read fresh data at submission time, not stale component state.
      const currentBooks = readArray(BOOKS_KEY);
      const currentIssues = readArray(ISSUES_KEY);
      const currentStudents = readArray(STUDENTS_KEY);
      const now = todayLocal();
      const selectedStudent = currentStudents.find(
        (student) => String(student.id) === String(formData.studentId)
      );
      const selectedBook = currentBooks.find(
        (book) => String(book.id) === String(formData.bookId)
      );

      if (!selectedStudent || !isActive(selectedStudent)) {
        throw new Error("Select a registered, active student.");
      }
      if (!selectedBook) throw new Error("Select a valid library book.");
      if (!formData.issueDate || !formData.dueDate) {
        throw new Error("Please select both issue and due dates.");
      }
      if (formData.issueDate > now) {
        throw new Error("Issue date cannot be in the future.");
      }
      if (formData.dueDate < formData.issueDate) {
        throw new Error("Due date cannot be earlier than the issue date.");
      }
      const copies = Number(selectedBook.availableCopies);
      if (!Number.isInteger(copies) || copies <= 0) {
        throw new Error("This book has no available copies.");
      }
      const duplicate = currentIssues.some(
        (issue) =>
          String(issue.studentId).trim().toLowerCase() === String(selectedStudent.id).trim().toLowerCase() &&
          String(issue.bookId) === String(selectedBook.id) &&
          issue.status === "Issued"
      );
      if (duplicate) {
        throw new Error("This student already has an active issue for this book.");
      }

      const newIssue = {
        id: crypto.randomUUID(),
        studentName: selectedStudent.name,
        studentId: selectedStudent.id,
        bookId: selectedBook.id,
        bookTitle: selectedBook.title,
        isbn: selectedBook.isbn,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: "Issued",
        returnDate: null,
      };
      const updatedBooks = currentBooks.map((book) =>
        String(book.id) === String(selectedBook.id)
          ? { ...book, availableCopies: Number(book.availableCopies) - 1 }
          : book
      );
      const updatedIssues = [...currentIssues, newIssue];

      // localStorage is NOT transactional. Best-effort rollback if the second write fails.
      const originalBooks = localStorage.getItem(BOOKS_KEY);
      try {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
        localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedIssues));
      } catch (storageError) {
        try {
          if (originalBooks === null) localStorage.removeItem(BOOKS_KEY);
          else localStorage.setItem(BOOKS_KEY, originalBooks);
        } catch (rollbackError) {
          console.error("Book rollback failed:", rollbackError);
        }
        throw new Error("Could not save the issue. Check browser storage and verify book records before retrying.");
      }

      setBooks(updatedBooks);
      setIssues(updatedIssues);
      setStudents(currentStudents);
      setShowModal(false);
      requestAnimationFrame(() => openerRef.current?.focus());
      setNotice(`Successfully issued “${selectedBook.title}” to ${selectedStudent.name}.`);
    } catch (issueError) {
      setError(issueError.message || "Unable to issue the book.");
      refreshData();
    } finally {
      setSaving(false);
    }
  }

  const today = todayLocal();
  const activeIssues = issues.filter((issue) => issue.status === "Issued");
  const dueToday = activeIssues.filter((issue) => issue.dueDate === today).length;
  const overdue = activeIssues.filter((issue) => issue.dueDate && issue.dueDate < today).length;
  const query = search.trim().toLowerCase();
  const filteredIssues = activeIssues.filter((issue) =>
    [issue.studentName, issue.studentId, issue.bookTitle, issue.isbn].some((value) =>
      String(value || "").toLowerCase().includes(query)
    )
  );
  const activeStudents = students.filter(isActive);
  const availableBooks = books.filter((book) => Number(book.availableCopies) > 0);
  const selectedBook = availableBooks.find((book) => String(book.id) === String(formData.bookId));

  return (
    <main className="issue-books-page">
      <header className="issue-page-header">
        <div>
          <h1>Issue Books</h1>
          <p>Manage borrowing, due dates, and active student loans.</p>
        </div>
        <button type="button" className="issue-add-btn" onClick={openModal}>
          <Plus size={18} /> Issue New Book
        </button>
      </header>

      {notice && <div className="issue-notice" role="status">{notice}</div>}

      <section className="issue-summary-grid" aria-label="Issue statistics">
        <div className="issue-summary-card">
          <div className="issue-summary-icon blue"><BookMarked size={23} /></div>
          <div><p>Currently Issued</p><h2>{activeIssues.length}</h2></div>
        </div>
        <div className="issue-summary-card">
          <div className="issue-summary-icon orange"><Clock size={23} /></div>
          <div><p>Due Today</p><h2>{dueToday}</h2></div>
        </div>
        <div className="issue-summary-card">
          <div className="issue-summary-icon red"><AlertTriangle size={23} /></div>
          <div><p>Overdue Books</p><h2>{overdue}</h2></div>
        </div>
      </section>

      <section className="issue-table-section">
        <div className="issue-table-header">
          <div><h2>Active Book Issues</h2><p>{filteredIssues.length} records found</p></div>
          <div className="issue-table-controls">
            <label className="issue-search-box">
              <Search size={18} aria-hidden="true" />
              <span className="issue-visually-hidden">Search active issues</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or book..." />
            </label>
            <button type="button" className="issue-refresh-btn" onClick={refreshData} aria-label="Refresh issue records" title="Refresh records">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        <div className="issue-table-wrapper">
          <table className="issue-table">
            <thead><tr><th>Student</th><th>Book Details</th><th>Issue Date</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              {filteredIssues.length ? filteredIssues.map((issue) => {
                const late = Boolean(issue.dueDate && issue.dueDate < today);
                return (
                  <tr key={issue.id}>
                    <td><div className="issue-student-info"><h4>{issue.studentName || "Unknown Student"}</h4><p>{issue.studentId}</p></div></td>
                    <td><div className="issue-book-info"><div className="issue-book-icon"><BookOpen size={19} /></div><div><h4>{issue.bookTitle || "Unknown Book"}</h4><p>ISBN: {issue.isbn || "—"}</p></div></div></td>
                    <td>{issue.issueDate || "—"}</td>
                    <td>{issue.dueDate || "—"}</td>
                    <td><span className={`issue-status ${late ? "overdue" : "issued"}`}>{late ? "Overdue" : "Issued"}</span></td>
                  </tr>
                );
              }) : <tr><td colSpan="5" className="issue-empty-message">No active issue records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="issue-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div ref={modalRef} className="issue-modal" role="dialog" aria-modal="true" aria-labelledby="issue-modal-title" aria-describedby="issue-modal-description">
            <div className="issue-modal-header">
              <div><h2 id="issue-modal-title">Issue New Book</h2><p id="issue-modal-description">Select a registered student and an available book.</p></div>
              <button type="button" className="issue-close-btn" onClick={closeModal} aria-label="Close issue form" disabled={saving}><X size={22} /></button>
            </div>
            {error && <div className="issue-form-error" role="alert">{error}</div>}
            <form onSubmit={handleIssueBook}>
              <div className="issue-form-group">
                <label htmlFor="issue-student">Registered Student</label>
                <div className="issue-select-with-icon"><Users size={18} aria-hidden="true" />
                  <select ref={studentSelectRef} id="issue-student" name="studentId" value={formData.studentId} onChange={changeField} required>
                    <option value="">Select an active student</option>
                    {activeStudents.map((student) => <option key={student.id} value={student.id}>{student.id} — {student.name}</option>)}
                  </select>
                </div>
                {!activeStudents.length && <p className="issue-form-hint">No active students. <Link to="/admin/students" onClick={closeModal}>Manage students</Link> first.</p>}
              </div>
              <div className="issue-form-group">
                <label htmlFor="issue-book">Available Book</label>
                <div className="issue-select-with-icon"><BookOpen size={18} aria-hidden="true" />
                  <select id="issue-book" name="bookId" value={formData.bookId} onChange={changeField} required>
                    <option value="">Select an available book</option>
                    {availableBooks.map((book) => <option key={book.id} value={book.id}>{book.title} ({book.availableCopies} available)</option>)}
                  </select>
                </div>
                {selectedBook && <p className="issue-form-hint">ISBN: {selectedBook.isbn} · {selectedBook.availableCopies} copies available</p>}
                {!availableBooks.length && <p className="issue-form-hint">No available books. <Link to="/admin/books" onClick={closeModal}>Manage books</Link> first.</p>}
              </div>
              <div className="issue-date-grid">
                <div className="issue-form-group">
                  <label htmlFor="issue-date">Issue Date</label>
                  <div className="issue-date-input"><CalendarDays size={18} aria-hidden="true" />
                    <input id="issue-date" type="date" name="issueDate" value={formData.issueDate} onChange={changeField} max={today} required />
                  </div>
                </div>
                <div className="issue-form-group">
                  <label htmlFor="issue-due">Due Date</label>
                  <div className="issue-date-input"><CalendarDays size={18} aria-hidden="true" />
                    <input id="issue-due" type="date" name="dueDate" value={formData.dueDate} onChange={changeField} min={formData.issueDate} required />
                  </div>
                </div>
              </div>
              <div className="issue-modal-actions">
                <button type="button" className="issue-cancel-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="issue-save-btn" disabled={saving || !activeStudents.length || !availableBooks.length}>{saving ? "Issuing..." : "Issue Book"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default IssueBook;
