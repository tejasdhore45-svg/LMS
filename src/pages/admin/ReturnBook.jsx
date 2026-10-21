// ======================================================
// LIBRARY MANAGEMENT SYSTEM - RETURN BOOK
// ======================================================
import { useEffect, useRef, useState } from "react";
import {
  Search, BookOpen, BookCheck, Clock, AlertTriangle,
  RotateCcw, X, CheckCircle2, CalendarDays, RefreshCw,
} from "lucide-react";
import "./ReturnBook.css";

const BOOKS_KEY = "lms_books";
const ISSUES_KEY = "lms_issues";

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { data: [], error: null };
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Stored value is not an array");
    return { data: value, error: null };
  } catch {
    return { data: [], error: `Unable to read ${key}. Please check your saved data.` };
  }
}

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function loadRecords() {
  const books = readArray(BOOKS_KEY);
  const issues = readArray(ISSUES_KEY);
  return {
    books: books.data,
    issues: issues.data,
    error: books.error || issues.error,
  };
}

function ReturnBook() {
  const [records, setRecords] = useState(loadRecords);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  function refreshRecords() {
    setRecords(loadRecords());
  }

  useEffect(() => {
    const onFocus = () => refreshRecords();
    const onStorage = (event) => {
      if (!event.key || [BOOKS_KEY, ISSUES_KEY].includes(event.key)) refreshRecords();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function closeModal() {
    if (busy) return;
    setSelectedIssue(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  useEffect(() => {
    if (!selectedIssue) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.querySelector("button")?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
      if (event.key === "Tab" && dialog) {
        const buttons = [...dialog.querySelectorAll("button:not([disabled])")];
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIssue, busy]);

  function openModal(issue, event) {
    returnFocusRef.current = event.currentTarget;
    setMessage(null);
    setSelectedIssue(issue);
  }

  function confirmReturn() {
    if (!selectedIssue || busy) return;
    setBusy(true);
    try {
      // Always validate the latest records rather than relying on stale React state.
      const latest = loadRecords();
      if (latest.error) throw new Error(latest.error);
      const issue = latest.issues.find((item) => String(item.id) === String(selectedIssue.id));
      if (!issue) throw new Error("This issue record no longer exists. Refresh and try again.");
      if (issue.status !== "Issued") throw new Error("This book has already been returned.");
      const book = latest.books.find((item) => String(item.id) === String(issue.bookId));
      if (!book) throw new Error("The linked book record is missing. Return was not saved.");
      const available = Number(book.availableCopies);
      const total = Number(book.totalCopies);
      if (!Number.isSafeInteger(available) || !Number.isSafeInteger(total) ||
          available < 0 || total < 0 || available >= total) {
        throw new Error("Book copy counts are inconsistent. Please correct the inventory before returning.");
      }
      const updatedBooks = latest.books.map((item) =>
        String(item.id) === String(book.id)
          ? { ...item, availableCopies: available + 1 }
          : item
      );
      const updatedIssues = latest.issues.map((item) =>
        String(item.id) === String(issue.id)
          ? { ...item, status: "Returned", returnDate: todayLocal() }
          : item
      );
      // localStorage is not transactional: attempt to restore the first key if the second write fails.
      const oldBooks = localStorage.getItem(BOOKS_KEY);
      try {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
        localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedIssues));
      } catch {
        try {
          if (oldBooks === null) localStorage.removeItem(BOOKS_KEY);
          else localStorage.setItem(BOOKS_KEY, oldBooks);
        } catch {
          throw new Error("Saving failed and book inventory could not be restored. Check stored records before continuing.");
        }
        throw new Error("Unable to save the return. No changes were confirmed.");
      }
      setRecords({ books: updatedBooks, issues: updatedIssues, error: null });
      setSelectedIssue(null);
      setMessage({ type: "success", text: `“${issue.bookTitle || "Book"}” returned successfully.` });
      requestAnimationFrame(() => returnFocusRef.current?.focus());
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Return failed." });
      setSelectedIssue(null);
      refreshRecords();
    } finally {
      setBusy(false);
    }
  }

  const today = todayLocal();
  const activeIssues = records.issues.filter((item) => item.status === "Issued");
  const returnedIssues = records.issues.filter((item) => item.status === "Returned");
  const overdueIssues = activeIssues.filter((item) => item.dueDate && item.dueDate < today);
  const source = activeTab === "active" ? activeIssues : returnedIssues;
  const term = search.trim().toLowerCase();
  const filteredIssues = source.filter((issue) =>
    [issue.studentName, issue.studentId, issue.bookTitle, issue.isbn]
      .some((field) => String(field ?? "").toLowerCase().includes(term))
  ).sort((a, b) => String(activeTab === "active" ? b.issueDate || "" : b.returnDate || "")
    .localeCompare(String(activeTab === "active" ? a.issueDate || "" : a.returnDate || "")));

  return (
    <main className="return-books-page">
      <div className="return-page-header">
        <div>
          <h1>Return Books</h1>
          <p>Manage book returns and track borrowing records.</p>
        </div>
        <button type="button" className="return-refresh-btn" onClick={refreshRecords}>
          <RefreshCw size={17} /> Refresh Records
        </button>
      </div>

      {(records.error || message) && (
        <div className={`return-notice ${(records.error || message?.type === "error") ? "error" : "success"}`} role="status">
          {records.error || message?.text}
        </div>
      )}

      <div className="return-summary-grid">
        <div className="return-summary-card"><div className="return-summary-icon blue"><BookOpen size={23} /></div><div><p>Currently Issued</p><h2>{activeIssues.length}</h2></div></div>
        <div className="return-summary-card"><div className="return-summary-icon green"><BookCheck size={23} /></div><div><p>Total Returned</p><h2>{returnedIssues.length}</h2></div></div>
        <div className="return-summary-card"><div className="return-summary-icon red"><AlertTriangle size={23} /></div><div><p>Overdue Books</p><h2>{overdueIssues.length}</h2></div></div>
      </div>

      <section className="return-table-section" aria-label="Book return management">
        <div className="return-table-header">
          <div><h2>Book Return Management</h2><p>{filteredIssues.length} records found</p></div>
          <label className="return-search-box">
            <Search size={18} aria-hidden="true" />
            <input type="search" aria-label="Search by student, ID, book or ISBN" placeholder="Search student or book..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <div className="return-tabs" role="group" aria-label="Return record filter">
          <button type="button" className={`return-tab ${activeTab === "active" ? "active" : ""}`} aria-pressed={activeTab === "active"} onClick={() => setActiveTab("active")}><Clock size={17} /> Active Issues <span>{activeIssues.length}</span></button>
          <button type="button" className={`return-tab ${activeTab === "returned" ? "active" : ""}`} aria-pressed={activeTab === "returned"} onClick={() => setActiveTab("returned")}><CheckCircle2 size={17} /> Return History <span>{returnedIssues.length}</span></button>
        </div>
        <div className="return-table-wrapper">
          <table className="return-table">
            <thead><tr><th>Student</th><th>Book Details</th><th>Issue Date</th><th>Due Date</th><th>{activeTab === "active" ? "Status" : "Return Date"}</th><th>Action</th></tr></thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr><td colSpan={6} className="return-empty-message">{term ? "No matching records found." : activeTab === "active" ? "No active book issues found." : "No returned books found."}</td></tr>
              ) : filteredIssues.map((issue, index) => {
                const overdue = issue.status === "Issued" && issue.dueDate && issue.dueDate < today;
                return (
                  <tr key={issue.id ?? index}>
                    <td><div className="return-student-info"><h4>{issue.studentName || "Unknown student"}</h4><p>{issue.studentId || "—"}</p></div></td>
                    <td><div className="return-book-info"><div className="return-book-icon"><BookOpen size={19} /></div><div><h4>{issue.bookTitle || "Unknown book"}</h4><p>ISBN: {issue.isbn || "—"}</p></div></div></td>
                    <td>{issue.issueDate || "—"}</td><td>{issue.dueDate || "—"}</td>
                    <td>{activeTab === "active" ? <span className={`return-status ${overdue ? "overdue" : "issued"}`}>{overdue ? "Overdue" : "Issued"}</span> : <span className="return-date-text">{issue.returnDate || "—"}</span>}</td>
                    <td>{activeTab === "active" ? <button type="button" className="return-action-btn" disabled={Boolean(records.error)} onClick={(event) => openModal(issue, event)}><RotateCcw size={16} /> Return</button> : <span className="return-completed-label"><CheckCircle2 size={16} /> Completed</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedIssue && (
        <div className="return-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="return-modal" role="dialog" aria-modal="true" aria-labelledby="return-modal-title" ref={dialogRef}>
            <div className="return-modal-header"><div className="return-modal-icon"><RotateCcw size={25} /></div><button type="button" className="return-close-btn" onClick={closeModal} aria-label="Close confirmation"><X size={22} /></button></div>
            <h2 id="return-modal-title">Confirm Book Return</h2>
            <p className="return-modal-description">Confirm that the physical book has been received before marking it as returned.</p>
            <div className="return-confirm-details">
              <div><span>Student</span><strong>{selectedIssue.studentName || "—"}</strong></div>
              <div><span>Student ID</span><strong>{selectedIssue.studentId || "—"}</strong></div>
              <div><span>Book</span><strong>{selectedIssue.bookTitle || "—"}</strong></div>
              <div><span>Due Date</span><strong>{selectedIssue.dueDate || "—"}</strong></div>
              <div><span>Return Date</span><strong><CalendarDays size={15} /> {today}</strong></div>
            </div>
            <div className="return-modal-actions"><button type="button" className="return-cancel-btn" disabled={busy} onClick={closeModal}>Cancel</button><button type="button" className="return-confirm-btn" disabled={busy} onClick={confirmReturn}><CheckCircle2 size={18} /> {busy ? "Saving..." : "Confirm Return"}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ReturnBook;
