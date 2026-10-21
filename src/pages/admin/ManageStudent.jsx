import { useEffect, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Users, UserCheck, GraduationCap, RefreshCw } from "lucide-react";
import "./ManageStudent.css";

const STUDENTS_KEY = "lms_students";
const ISSUES_KEY = "lms_issues";
const initialStudents = [
  { id: "STU001", name: "Rahul Patil", email: "rahul@example.com", phone: "9876543210", department: "Computer Science", year: "Second Year", status: "Active" },
  { id: "STU002", name: "Priya Sharma", email: "priya@example.com", phone: "9876543211", department: "Information Technology", year: "Third Year", status: "Active" },
  { id: "STU003", name: "Amit Deshmukh", email: "amit@example.com", phone: "9876543212", department: "Mechanical", year: "First Year", status: "Active" },
  { id: "STU004", name: "Sneha Kulkarni", email: "sneha@example.com", phone: "9876543213", department: "Civil", year: "Fourth Year", status: "Inactive" },
];
const emptyForm = { id: "", name: "", email: "", phone: "", department: "", year: "", status: "Active" };
const departments = ["Computer Science", "Information Technology", "Mechanical", "Civil", "Electrical", "Electronics", "Other"];
const years = ["First Year", "Second Year", "Third Year", "Fourth Year"];

// Missing student storage is seeded once. Invalid existing storage is NEVER overwritten.
function readArray(key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Invalid saved data for ${key}.`);
  return parsed;
}
const sameId = (a, b) => String(a ?? "").trim().toUpperCase() === String(b ?? "").trim().toUpperCase();
const hasActiveLoan = (issues, id) => issues.some((issue) => sameId(issue.studentId, id) && issue.status === "Issued");

export default function ManageStudent() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const firstInputRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  function refresh() {
    try {
      const data = readArray(STUDENTS_KEY, initialStudents);
      // Persist initial seed only when no existing record is stored.
      if (localStorage.getItem(STUDENTS_KEY) === null) {
        localStorage.setItem(STUDENTS_KEY, JSON.stringify(data));
      }
      setStudents(data);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to read saved students. Your data has not been changed.");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!showModal) return;
    firstInputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab") return;
      const focusables = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  function openModal(student = null) {
    previousFocusRef.current = document.activeElement;
    setEditingId(student ? student.id : null);
    setFormData(student ? { ...emptyForm, ...student } : { ...emptyForm });
    setError("");
    setNotice("");
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
    setError("");
    requestAnimationFrame(() => previousFocusRef.current?.focus?.());
  }
  function saveStudents(next) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(next));
    setStudents(next);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const data = {
      id: formData.id.trim().toUpperCase(),
      name: formData.name.trim().replace(/\s+/g, " "),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      department: formData.department,
      year: formData.year,
      status: formData.status,
    };
    if (Object.values(data).some((value) => !value)) return setError("Complete all required fields.");
    if (!/^[A-Z0-9_-]{3,24}$/.test(data.id)) return setError("Student ID must be 3–24 letters, numbers, underscores or hyphens.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return setError("Enter a valid email address.");
    if (!/^[0-9]{10}$/.test(data.phone)) return setError("Enter a valid 10-digit phone number.");
    if (!departments.includes(data.department) || !years.includes(data.year) || !["Active", "Inactive"].includes(data.status)) return setError("Choose valid student details.");

    try {
      const latest = readArray(STUDENTS_KEY, initialStudents);
      const current = editingId === null ? null : latest.find((student) => sameId(student.id, editingId));
      if (editingId !== null && !current) return setError("This student no longer exists. Refresh the list.");
      if (current) data.id = current.id; // Stable IDs preserve loan references.
      if (latest.some((student) => !sameId(student.id, editingId) && sameId(student.id, data.id))) return setError("Student ID already exists.");
      if (latest.some((student) => !sameId(student.id, editingId) && String(student.email || "").toLowerCase() === data.email)) return setError("Email address already exists.");
      if (current && current.status !== "Inactive" && data.status === "Inactive") {
        const issues = readArray(ISSUES_KEY);
        if (hasActiveLoan(issues, data.id)) return setError("Return all borrowed books before deactivating this student.");
      }
      const updated = current
        ? latest.map((student) => sameId(student.id, editingId) ? { ...student, ...data } : student)
        : [...latest, data];
      saveStudents(updated);
      closeModal();
      setNotice(current ? "Student updated successfully." : "Student registered successfully.");
    } catch (err) {
      setError(err.message || "Could not save student. Please try again.");
    }
  }

  function handleDelete(student) {
    setError("");
    setNotice("");
    try {
      const latest = readArray(STUDENTS_KEY, initialStudents);
      const issues = readArray(ISSUES_KEY);
      if (!latest.some((item) => sameId(item.id, student.id))) return setError("Student no longer exists. Refresh the list.");
      if (hasActiveLoan(issues, student.id)) return setError("Cannot delete this student while they have borrowed books.");
      // Preserve historical loan references: do not reuse this ID after deletion.
      if (!window.confirm(`Delete ${student.name} (${student.id})? Past transaction history will remain.`)) return;
      saveStudents(latest.filter((item) => !sameId(item.id, student.id)));
      setNotice("Student deleted. Historical transactions were preserved.");
    } catch (err) {
      setError(err.message || "Could not delete student.");
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = students.filter((student) => {
    const searchable = [student.name, student.id, student.email, student.phone, student.department, student.year].map((v) => String(v ?? "").toLowerCase());
    return searchable.some((value) => value.includes(query)) && (statusFilter === "All" || student.status === statusFilter) && (departmentFilter === "All" || student.department === departmentFilter);
  });
  const activeCount = students.filter((student) => student.status === "Active").length;
  const inactiveCount = students.filter((student) => student.status === "Inactive").length;

  return (
    <main className="manage-students-page">
      <header className="students-page-header">
        <div><h1>Manage Students</h1><p>Register and manage library student records.</p></div>
        <button className="students-add-btn" onClick={() => openModal()}><Plus size={19} /> Add New Student</button>
      </header>

      {error && !showModal && <div className="students-alert error" role="alert">{error}</div>}
      {notice && <div className="students-alert success" role="status">{notice}</div>}

      <div className="students-summary-grid">
        <div className="students-summary-card"><div className="students-summary-icon blue"><Users size={23} /></div><div><p>Total Students</p><h2>{students.length}</h2></div></div>
        <div className="students-summary-card"><div className="students-summary-icon green"><UserCheck size={23} /></div><div><p>Active Students</p><h2>{activeCount}</h2></div></div>
        <div className="students-summary-card"><div className="students-summary-icon orange"><GraduationCap size={23} /></div><div><p>Inactive Students</p><h2>{inactiveCount}</h2></div></div>
      </div>

      <section className="students-table-section">
        <div className="students-table-header">
          <div><h2>Registered Students</h2><p>{filtered.length} students found</p></div>
          <div className="students-table-actions">
            <label className="students-search-box"><Search size={18} /><input aria-label="Search students" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <select className="students-status-filter" aria-label="Filter by department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="All">All Departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            <select className="students-status-filter" aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">All Statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
            <button className="students-refresh-btn" onClick={refresh} title="Refresh student records" aria-label="Refresh student records"><RefreshCw size={17} /></button>
          </div>
        </div>
        <div className="students-table-wrapper">
          <table className="students-table">
            <thead><tr><th>Student</th><th>Student ID</th><th>Contact</th><th>Department</th><th>Year</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((student) => <tr key={student.id}>
                <td><div className="students-name-cell"><div className="students-avatar">{String(student.name || "?").charAt(0).toUpperCase()}</div><strong>{student.name}</strong></div></td>
                <td>{student.id}</td><td><div className="students-contact"><span>{student.email}</span><small>{student.phone}</small></div></td>
                <td>{student.department}</td><td>{student.year}</td>
                <td><span className={`students-status ${student.status === "Active" ? "active" : "inactive"}`}>{student.status}</span></td>
                <td><div className="students-action-buttons"><button className="students-edit-btn" onClick={() => openModal(student)} aria-label={`Edit ${student.name}`} title="Edit student"><Pencil size={17} /></button><button className="students-delete-btn" onClick={() => handleDelete(student)} aria-label={`Delete ${student.name}`} title="Delete student"><Trash2 size={17} /></button></div></td>
              </tr>) : <tr><td className="students-empty-message" colSpan={7}>No students match your search or filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && <div className="students-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="students-modal" role="dialog" aria-modal="true" aria-labelledby="students-modal-title" ref={dialogRef}>
          <div className="students-modal-header"><div><h2 id="students-modal-title">{editingId !== null ? "Edit Student" : "Add New Student"}</h2><p>Enter student registration details.</p></div><button className="students-close-btn" onClick={closeModal} aria-label="Close dialog"><X size={22} /></button></div>
          {error && <div className="students-alert error" role="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="students-form-grid">
              <div className="students-form-group"><label htmlFor="student-id">Student ID</label><input id="student-id" ref={firstInputRef} name="id" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} placeholder="e.g. STU005" disabled={editingId !== null} maxLength={24} required /></div>
              <div className="students-form-group"><label htmlFor="student-name">Full Name</label><input id="student-name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" maxLength={100} required /></div>
              <div className="students-form-group"><label htmlFor="student-email">Email Address</label><input id="student-email" type="email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="student@example.com" required /></div>
              <div className="students-form-group"><label htmlFor="student-phone">Phone Number</label><input id="student-phone" type="tel" inputMode="numeric" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="10-digit mobile number" maxLength={10} required /></div>
              <div className="students-form-group"><label htmlFor="student-department">Department</label><select id="student-department" name="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required><option value="">Select Department</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
              <div className="students-form-group"><label htmlFor="student-year">Academic Year</label><select id="student-year" name="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} required><option value="">Select Year</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="students-form-group students-form-full"><label htmlFor="student-status">Account Status</label><select id="student-status" name="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
            </div>
            <div className="students-modal-actions"><button type="button" className="students-cancel-btn" onClick={closeModal}>Cancel</button><button type="submit" className="students-save-btn">{editingId !== null ? "Update Student" : "Add Student"}</button></div>
          </form>
        </div>
      </div>}
    </main>
  );
}
