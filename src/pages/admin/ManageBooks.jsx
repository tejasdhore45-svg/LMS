// ======================================================
// LIBRARY MANAGEMENT SYSTEM - MANAGE BOOKS
// ======================================================
import { useEffect, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, BookOpen, Filter } from "lucide-react";
import "./ManageBooks.css";

const BOOKS_KEY = "lms_books";
const ISSUES_KEY = "lms_issues";
const CATEGORIES = ["Programming", "Computer Science", "Database", "Networking", "Operating Systems", "Mathematics", "Science", "Literature", "Other"];

// Preserve the existing sample books for first-time users only.
const initialBooks = [
  { id: 1, title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "9780262046305", category: "Computer Science", totalCopies: 10, availableCopies: 7 },
  { id: 2, title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", category: "Programming", totalCopies: 8, availableCopies: 5 },
  { id: 3, title: "Database Management Systems", author: "Raghu Ramakrishnan", isbn: "9780072465631", category: "Database", totalCopies: 12, availableCopies: 9 },
  { id: 4, title: "Computer Networks", author: "Andrew S. Tanenbaum", isbn: "9780132126953", category: "Networking", totalCopies: 6, availableCopies: 0 },
  { id: 5, title: "Operating System Concepts", author: "Abraham Silberschatz", isbn: "9781119800361", category: "Operating Systems", totalCopies: 15, availableCopies: 11 },
];
const EMPTY_FORM = { title: "", author: "", isbn: "", category: "", totalCopies: "" };

function readArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function ManageBooks() {
  const [books, setBooks] = useState(() => readArray(BOOKS_KEY, initialBooks));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const modalRef = useRef(null);
  const titleRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Save book changes. The initial state is preserved from storage, not overwritten with samples.
  useEffect(() => {
    try { localStorage.setItem(BOOKS_KEY, JSON.stringify(books)); }
    catch { console.error("Unable to save books to localStorage."); }
  }, [books]);

  // Keep the list fresh if another tab modifies the collection.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === BOOKS_KEY || event.key === null) {
        setBooks(readArray(BOOKS_KEY, initialBooks));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Modal keyboard behavior: initial focus, Escape, and focus trap.
  useEffect(() => {
    if (!showModal) return;
    titleRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const elements = [...modalRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')];
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  function openModal(book = null) {
    previousFocusRef.current = document.activeElement;
    setEditingId(book?.id ?? null);
    setFormData(book ? {
      title: book.title, author: book.author, isbn: book.isbn,
      category: book.category, totalCopies: String(book.totalCopies),
    } : { ...EMPTY_FORM });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
    requestAnimationFrame(() => previousFocusRef.current?.focus?.());
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (formError) setFormError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const title = formData.title.trim();
    const author = formData.author.trim();
    const isbn = formData.isbn.trim().replace(/[\s-]/g, "");
    const totalCopies = Number(formData.totalCopies);
    const current = books.find((book) => book.id === editingId);

    if (!title || !author || !CATEGORIES.includes(formData.category)) {
      setFormError("Complete all required book details."); return;
    }
    if (!/^(?:\d{10}|\d{13})$/.test(isbn)) {
      setFormError("ISBN must contain exactly 10 or 13 digits."); return;
    }
    if (!Number.isSafeInteger(totalCopies) || totalCopies < 1) {
      setFormError("Total copies must be a positive whole number."); return;
    }
    if (books.some((book) => String(book.isbn).replace(/[\s-]/g, "") === isbn && book.id !== editingId)) {
      setFormError("A book with this ISBN already exists."); return;
    }

    if (editingId !== null) {
      if (!current) { setFormError("Book no longer exists. Refresh and try again."); return; }
      // Existing availability differences may represent legacy loans not recorded in lms_issues.
      // Preserve them rather than silently resetting stock.
      const previouslyUnavailable = Math.max(0, Number(current.totalCopies) - Number(current.availableCopies));
      const activeIssues = readArray(ISSUES_KEY).filter((issue) =>
        issue.status === "Issued" && String(issue.bookId) === String(current.id)
      ).length;
      const reservedCopies = Math.max(previouslyUnavailable, activeIssues);
      if (totalCopies < reservedCopies) {
        setFormError(`At least ${reservedCopies} copies are currently unavailable. Total copies cannot be lower.`);
        return;
      }
      setBooks((previous) => previous.map((book) => book.id === editingId ? {
        ...book, title, author, isbn, category: formData.category,
        totalCopies, availableCopies: totalCopies - reservedCopies,
      } : book));
    } else {
      setBooks((previous) => [...previous, {
        id: crypto.randomUUID(), title, author, isbn, category: formData.category,
        totalCopies, availableCopies: totalCopies,
      }]);
    }
    closeModal();
  }

  function handleDeleteBook(book) {
    const unavailable = Number(book.totalCopies) - Number(book.availableCopies);
    const hasActiveIssues = readArray(ISSUES_KEY).some((issue) =>
      issue.status === "Issued" && String(issue.bookId) === String(book.id)
    );
    if (unavailable > 0 || hasActiveIssues) {
      window.alert("This book has unavailable or actively issued copies and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete “${book.title}”? This cannot be undone.`)) return;
    setBooks((previous) => previous.filter((item) => item.id !== book.id));
  }

  const filteredBooks = books.filter((book) => {
    const query = search.trim().toLowerCase();
    const matchesText = [book.title, book.author, book.isbn].some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    );
    return matchesText && (categoryFilter === "All" || book.category === categoryFilter);
  });
  const totalCopies = books.reduce((sum, book) => sum + Number(book.totalCopies || 0), 0);
  const availableCopies = books.reduce((sum, book) => sum + Number(book.availableCopies || 0), 0);

  return (
    <main className="manage-books-page">
      <header className="manage-books-header">
        <div><h1>Manage Books</h1><p>Add, update, and manage your library collection.</p></div>
        <button type="button" className="add-book-btn" onClick={() => openModal()}><Plus size={19} /> Add New Book</button>
      </header>

      <section className="book-summary-grid" aria-label="Book summary">
        <div className="book-summary-card"><p>Total Book Titles</p><h2>{books.length.toLocaleString("en-IN")}</h2></div>
        <div className="book-summary-card"><p>Total Copies</p><h2>{totalCopies.toLocaleString("en-IN")}</h2></div>
        <div className="book-summary-card"><p>Available Copies</p><h2>{availableCopies.toLocaleString("en-IN")}</h2></div>
      </section>

      <section className="books-table-section">
        <div className="books-table-header">
          <div><h2>Library Books</h2><p>{filteredBooks.length} book titles found</p></div>
          <div className="books-table-actions">
            <label className="books-search-box"><Search size={18} aria-hidden="true" />
              <input aria-label="Search books" type="search" placeholder="Search books..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="books-filter-box"><Filter size={17} aria-hidden="true" />
              <select aria-label="Filter books by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="All">All Categories</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="books-table-wrapper" role="region" aria-label="Books table" tabIndex="0">
          <table className="books-table">
            <thead><tr><th>Book Details</th><th>ISBN</th><th>Category</th><th>Total Copies</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredBooks.length ? filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td><div className="book-info"><div className="book-icon"><BookOpen size={20} /></div><div><h4>{book.title}</h4><p>{book.author}</p></div></div></td>
                  <td>{book.isbn}</td>
                  <td><span className="book-category">{book.category}</span></td>
                  <td>{book.totalCopies}</td><td>{book.availableCopies}</td>
                  <td><span className={`book-status ${Number(book.availableCopies) > 0 ? "available" : "unavailable"}`}>{Number(book.availableCopies) > 0 ? "Available" : "Unavailable"}</span></td>
                  <td><div className="book-action-buttons">
                    <button type="button" className="edit-book-btn" onClick={() => openModal(book)} title="Edit Book" aria-label={`Edit ${book.title}`}><Pencil size={17} /></button>
                    <button type="button" className="delete-book-btn" onClick={() => handleDeleteBook(book)} title="Delete Book" aria-label={`Delete ${book.title}`}><Trash2 size={17} /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan="7" className="no-books-message">{books.length ? "No books match your search or filter." : "No books yet. Add your first book."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="book-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="book-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="book-modal-title" aria-describedby="book-modal-description">
            <div className="book-modal-header"><div><h2 id="book-modal-title">{editingId !== null ? "Edit Book" : "Add New Book"}</h2><p id="book-modal-description">Enter the book's details below.</p></div><button type="button" className="close-modal-btn" onClick={closeModal} aria-label="Close dialog"><X size={22} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="book-form-group"><label htmlFor="book-title">Book Title</label><input ref={titleRef} id="book-title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter book title" maxLength={150} required /></div>
              <div className="book-form-group"><label htmlFor="book-author">Author Name</label><input id="book-author" name="author" value={formData.author} onChange={handleInputChange} placeholder="Enter author name" maxLength={120} required /></div>
              <div className="book-form-group"><label htmlFor="book-isbn">ISBN Number</label><input id="book-isbn" name="isbn" value={formData.isbn} onChange={handleInputChange} placeholder="10 or 13 digits" inputMode="numeric" required /></div>
              <div className="book-form-group"><label htmlFor="book-category">Category</label><select id="book-category" name="category" value={formData.category} onChange={handleInputChange} required><option value="">Select Category</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
              <div className="book-form-group"><label htmlFor="book-copies">Total Copies</label><input id="book-copies" type="number" name="totalCopies" value={formData.totalCopies} onChange={handleInputChange} min="1" step="1" placeholder="Enter total copies" required /></div>
              {formError && <p className="book-form-error" role="alert">{formError}</p>}
              <div className="book-modal-actions"><button type="button" className="cancel-book-btn" onClick={closeModal}>Cancel</button><button type="submit" className="save-book-btn">{editingId !== null ? "Update Book" : "Add Book"}</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default ManageBooks;
