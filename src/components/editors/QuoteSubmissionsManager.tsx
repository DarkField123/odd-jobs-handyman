import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { EmailReplyModal } from './EmailReplyModal';
import { InvoiceBuilder } from './InvoiceBuilder';

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: 'new' | 'contacted' | 'quoted' | 'completed' | 'declined';
  createdAt: { seconds: number };
  jobName?: string;
  quoteRef?: string;
  confirmationEmail?: {
    sentAt: { seconds: number };
    status: 'sent' | 'failed';
    resendId?: string;
    error?: string;
  };
}

interface EmailReply {
  id: string;
  subject: string;
  body: string;
  sentBy: string;
  sentByEmail: string;
  createdAt: { seconds: number };
  status: 'pending' | 'sent' | 'failed';
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: { seconds: number };
  emailStatus?: {
    status: 'sent' | 'failed';
  };
}

// Modal for adding a new job manually
function NewJobModal({
  onClose,
  onCreated,
  generateQuoteRef,
}: {
  onClose: () => void;
  onCreated: () => void;
  generateQuoteRef: () => string;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.service.trim()) {
      setError('Name and service are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await addDoc(collection(db, 'submissions'), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        service: formData.service.trim(),
        message: formData.message.trim(),
        jobName: formData.service.trim(),
        status: 'new',
        quoteRef: generateQuoteRef(),
        createdAt: serverTimestamp(),
        manualEntry: true, // Flag to indicate this was added manually
      });
      onCreated();
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="new-job-modal">
        <div className="modal-header">
          <h3>Add New Job</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="07123 456789"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Service/Job Type *</label>
            <input
              type="text"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              placeholder="e.g. Kitchen fitting, Bathroom repair"
              required
            />
          </div>
          <div className="form-group">
            <label>Notes/Details</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Job details, address, special requirements..."
              rows={4}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuoteSubmissionsManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingJobName, setEditingJobName] = useState(false);
  const [jobNameValue, setJobNameValue] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  // Load submissions
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];
      setSubmissions(subs);
    });
    return () => unsubscribe();
  }, []);

  // Keep selectedSubmission in sync with submissions data
  useEffect(() => {
    if (selectedSubmission) {
      const updated = submissions.find(s => s.id === selectedSubmission.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedSubmission)) {
        setSelectedSubmission(updated);
      }
    }
  }, [submissions]);

  // Load replies when a submission is selected
  useEffect(() => {
    if (!selectedSubmission || !db) {
      setReplies([]);
      return;
    }

    const q = query(
      collection(db, 'submissions', selectedSubmission.id, 'emailReplies'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const replyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailReply[];
      setReplies(replyData);
    });

    return () => unsubscribe();
  }, [selectedSubmission?.id]);

  // Load invoices when a submission is selected
  useEffect(() => {
    if (!selectedSubmission || !db) {
      setInvoices([]);
      return;
    }

    const q = query(
      collection(db, 'invoices'),
      where('submissionId', '==', selectedSubmission.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(invoiceData);
    });

    return () => unsubscribe();
  }, [selectedSubmission?.id]);

  const handleStatusChange = async (id: string, newStatus: Submission['status']) => {
    try {
      await updateDoc(doc(db, 'submissions', id), { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'submissions', id));
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  const handleJobNameSave = async () => {
    if (!selectedSubmission) return;
    try {
      await updateDoc(doc(db, 'submissions', selectedSubmission.id), { jobName: jobNameValue });
      setEditingJobName(false);
    } catch (error) {
      console.error('Error updating job name:', error);
    }
  };

  const startEditingJobName = () => {
    if (selectedSubmission) {
      setJobNameValue(selectedSubmission.jobName || selectedSubmission.service);
      setEditingJobName(true);
    }
  };

  // Get date threshold for date filter
  const getDateThreshold = (filter: string): Date | null => {
    const now = new Date();
    switch (filter) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    // Status filter
    if (filter !== 'all' && s.status !== filter) return false;

    // Date filter
    const dateThreshold = getDateThreshold(dateFilter);
    if (dateThreshold && s.createdAt?.seconds) {
      const submissionDate = new Date(s.createdAt.seconds * 1000);
      if (submissionDate < dateThreshold) return false;
    }

    // Search filter - check name, email, phone, service, quoteRef
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = s.name.toLowerCase().includes(query);
      const matchesEmail = s.email.toLowerCase().includes(query);
      const matchesPhone = s.phone.toLowerCase().includes(query);
      const matchesService = s.service.toLowerCase().includes(query);
      const matchesRef = s.quoteRef?.toLowerCase().includes(query) || false;
      const matchesJobName = s.jobName?.toLowerCase().includes(query) || false;
      if (!matchesName && !matchesEmail && !matchesPhone && !matchesService && !matchesRef && !matchesJobName) {
        return false;
      }
    }

    return true;
  });

  const statusColors: Record<string, string> = {
    new: '#2196F3',
    contacted: '#FF9800',
    quoted: '#9C27B0',
    completed: '#4CAF50',
    declined: '#757575'
  };

  const formatDate = (timestamp: { seconds: number }) => {
    if (!timestamp?.seconds) return 'Unknown';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate quote reference: HMS + YYYYMMDD + 3-digit random number
  const generateQuoteRef = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `HMS${year}${month}${day}${random}`;
  };

  return (
    <div className="submissions-manager">
      <div className="manager-header">
        <div className="header-row">
          <h1>Quote Submissions</h1>
          <button className="btn btn-add-job" onClick={() => setShowNewJobModal(true)}>
            + Add Job
          </button>
        </div>
        <div className="search-filters-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email, phone, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="date-filter">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
        <div className="filter-tabs">
          {['all', 'new', 'contacted', 'quoted', 'completed', 'declined'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="count">
                  {submissions.filter(s => s.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="submissions-layout">
        <div className="submissions-list">
          {filteredSubmissions.length === 0 ? (
            <div className="empty-state">No submissions found</div>
          ) : (
            filteredSubmissions.map((sub) => (
              <div
                key={sub.id}
                className={`submission-card ${selectedSubmission?.id === sub.id ? 'selected' : ''}`}
                onClick={() => setSelectedSubmission(sub)}
              >
                <div className="submission-header">
                  <span className="name">{sub.name}</span>
                  <span className="status" style={{ background: statusColors[sub.status] }}>
                    {sub.status}
                  </span>
                </div>
                {sub.quoteRef && <div className="submission-ref">{sub.quoteRef}</div>}
                <div className="submission-service">{sub.jobName || sub.service}</div>
                <div className="submission-date">{formatDate(sub.createdAt)}</div>
              </div>
            ))
          )}
        </div>

        {selectedSubmission && (
          <div className="submission-detail">
            <div className="detail-header">
              <div className="header-left">
                <h2>{selectedSubmission.name}</h2>
                {selectedSubmission.quoteRef && (
                  <span className="quote-ref">{selectedSubmission.quoteRef}</span>
                )}
              </div>
              {selectedSubmission.confirmationEmail && (
                <span className={`email-status ${selectedSubmission.confirmationEmail.status}`}>
                  {selectedSubmission.confirmationEmail.status === 'sent'
                    ? 'Confirmation Sent'
                    : 'Confirmation Failed'}
                </span>
              )}
            </div>
            <div className="job-name-row">
              <label>Job Name</label>
              {editingJobName ? (
                <div className="job-name-edit">
                  <input
                    type="text"
                    value={jobNameValue}
                    onChange={(e) => setJobNameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJobNameSave()}
                    autoFocus
                  />
                  <button className="btn btn-save-small" onClick={handleJobNameSave}>Save</button>
                  <button className="btn btn-cancel-small" onClick={() => setEditingJobName(false)}>Cancel</button>
                </div>
              ) : (
                <div className="job-name-display">
                  <span>{selectedSubmission.jobName || selectedSubmission.service}</span>
                  <button className="btn btn-edit-small" onClick={startEditingJobName}>Edit</button>
                </div>
              )}
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Email</label>
                <a href={`mailto:${selectedSubmission.email}`}>{selectedSubmission.email}</a>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <a href={`tel:${selectedSubmission.phone}`}>{selectedSubmission.phone}</a>
              </div>
              <div className="detail-item">
                <label>Service</label>
                <span>{selectedSubmission.service}</span>
              </div>
              <div className="detail-item">
                <label>Submitted</label>
                <span>{formatDate(selectedSubmission.createdAt)}</span>
              </div>
            </div>
            <div className="detail-message">
              <label>Message</label>
              <p>{selectedSubmission.message}</p>
            </div>
            <div className="detail-actions">
              <label>Status</label>
              <select
                value={selectedSubmission.status}
                onChange={(e) => handleStatusChange(selectedSubmission.id, e.target.value as Submission['status'])}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quoted</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
              <button className="btn btn-reply" onClick={() => setShowReplyModal(true)}>
                Reply via Email
              </button>
              <button className="btn btn-invoice" onClick={() => setShowInvoiceModal(true)}>
                Create Invoice
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedSubmission.id)}>
                Delete
              </button>
            </div>

            {invoices.length > 0 && (
              <div className="invoice-history">
                <h3>Invoices</h3>
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="invoice-item">
                    <div className="invoice-header">
                      <span className="invoice-number">{invoice.invoiceNumber}</span>
                      <span className={`invoice-status ${invoice.status}`}>{invoice.status}</span>
                    </div>
                    <div className="invoice-details">
                      <span className="invoice-total">&pound;{invoice.total.toFixed(2)}</span>
                      <span className="invoice-due">Due: {new Date(invoice.dueDate).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="invoice-meta">
                      Created {formatDate(invoice.createdAt)}
                      {invoice.emailStatus && (
                        <span className={`email-badge ${invoice.emailStatus.status}`}>
                          {invoice.emailStatus.status === 'sent' ? 'Emailed' : 'Email failed'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {replies.length > 0 && (
              <div className="reply-history">
                <h3>Email History</h3>
                {replies.map((reply) => (
                  <div key={reply.id} className="reply-item">
                    <div className="reply-header">
                      <span className="reply-subject">{reply.subject}</span>
                      <span className={`reply-status ${reply.status}`}>{reply.status}</span>
                    </div>
                    <p className="reply-body">{reply.body}</p>
                    <div className="reply-meta">
                      Sent by {reply.sentByEmail} on {formatDate(reply.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showReplyModal && selectedSubmission && (
          <EmailReplyModal
            submissionId={selectedSubmission.id}
            customerName={selectedSubmission.name}
            customerEmail={selectedSubmission.email}
            service={selectedSubmission.service}
            onClose={() => setShowReplyModal(false)}
            onSent={() => {/* Replies update via onSnapshot */}}
          />
        )}

        {showInvoiceModal && selectedSubmission && (
          <InvoiceBuilder
            submissionId={selectedSubmission.id}
            customerName={selectedSubmission.name}
            customerEmail={selectedSubmission.email}
            customerPhone={selectedSubmission.phone}
            service={selectedSubmission.service}
            quoteRef={selectedSubmission.quoteRef}
            onClose={() => setShowInvoiceModal(false)}
            onCreated={() => {/* Invoices update via onSnapshot */}}
          />
        )}

        {showNewJobModal && (
          <NewJobModal
            onClose={() => setShowNewJobModal(false)}
            onCreated={() => setShowNewJobModal(false)}
            generateQuoteRef={generateQuoteRef}
          />
        )}
      </div>

      <style>{`
        .submissions-manager {
          padding: 2rem;
        }
        .manager-header {
          margin-bottom: 2rem;
        }
        .manager-header h1 {
          margin: 0;
          color: var(--text-primary);
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .btn-add-job {
          background: var(--accent);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .btn-add-job:hover {
          background: var(--accent-dark);
        }
        .search-filters-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .search-box {
          flex: 1;
          max-width: 400px;
        }
        .search-box input {
          width: 100%;
          padding: 0.625rem 1rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
        }
        .search-box input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .date-filter select {
          padding: 0.625rem 1rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
        }
        .date-filter select:focus {
          outline: none;
          border-color: var(--accent);
        }
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-tab {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-light);
          background: white;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-tab.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .filter-tab .count {
          background: rgba(0,0,0,0.1);
          padding: 0.125rem 0.5rem;
          border-radius: 10px;
          font-size: 0.8rem;
        }
        .submissions-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .submissions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 70vh;
          overflow-y: auto;
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }
        .submission-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1rem;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .submission-card:hover {
          border-color: var(--accent);
        }
        .submission-card.selected {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-lighter);
        }
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .submission-header .name {
          font-weight: 600;
        }
        .submission-header .status {
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          text-transform: capitalize;
        }
        .submission-ref {
          font-family: monospace;
          font-size: 0.75rem;
          color: #1565c0;
          background: #e3f2fd;
          display: inline-block;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          margin-bottom: 0.25rem;
        }
        .submission-service {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .submission-date {
          color: var(--text-light);
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        .submission-detail {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }
        .submission-detail h2 {
          margin: 0 0 1.5rem;
          color: var(--text-primary);
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .detail-item label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-light);
          margin-bottom: 0.25rem;
        }
        .detail-item a {
          color: var(--accent);
        }
        .detail-message {
          margin-bottom: 1.5rem;
        }
        .detail-message label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-light);
          margin-bottom: 0.5rem;
        }
        .detail-message p {
          margin: 0;
          background: #f9f9f9;
          padding: 1rem;
          border-radius: var(--radius-sm);
          white-space: pre-wrap;
        }
        .detail-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .detail-actions label {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .detail-actions select {
          padding: 0.5rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
        }
        .btn-danger {
          background: #f44336;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          margin-left: auto;
        }
        .btn-danger:hover {
          background: #d32f2f;
        }
        .btn-reply {
          background: var(--accent);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-reply:hover {
          background: var(--accent-dark);
        }
        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .detail-header h2 {
          margin: 0;
        }
        .email-status {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .email-status.sent {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .email-status.failed {
          background: #ffebee;
          color: #c62828;
        }
        .reply-history {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-light);
        }
        .reply-history h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
          color: var(--text-secondary);
        }
        .reply-item {
          background: #f9f9f9;
          border-radius: var(--radius-sm);
          padding: 1rem;
          margin-bottom: 0.75rem;
        }
        .reply-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .reply-subject {
          font-weight: 600;
          color: var(--text-primary);
        }
        .reply-status {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          text-transform: uppercase;
        }
        .reply-status.pending {
          background: #fff3e0;
          color: #e65100;
        }
        .reply-status.sent {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .reply-status.failed {
          background: #ffebee;
          color: #c62828;
        }
        .reply-body {
          margin: 0 0 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }
        .reply-meta {
          font-size: 0.75rem;
          color: var(--text-light);
        }
        .btn-invoice {
          background: #9c27b0;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-invoice:hover {
          background: #7b1fa2;
        }
        .invoice-history {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-light);
        }
        .invoice-history h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
          color: var(--text-secondary);
        }
        .invoice-item {
          background: #f3e5f5;
          border-radius: var(--radius-sm);
          padding: 1rem;
          margin-bottom: 0.75rem;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .invoice-number {
          font-weight: 600;
          color: #7b1fa2;
        }
        .invoice-status {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
        }
        .invoice-status.pending {
          background: #fff3e0;
          color: #e65100;
        }
        .invoice-status.paid {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .invoice-status.overdue {
          background: #ffebee;
          color: #c62828;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .invoice-total {
          font-weight: 600;
          color: var(--text-primary);
        }
        .invoice-due {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .invoice-meta {
          font-size: 0.75rem;
          color: var(--text-light);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .email-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .email-badge.sent {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .email-badge.failed {
          background: #ffebee;
          color: #c62828;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .header-left h2 {
          margin: 0;
        }
        .quote-ref {
          background: #e3f2fd;
          color: #1565c0;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: monospace;
        }
        .job-name-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 0.75rem;
          background: #f9f9f9;
          border-radius: var(--radius-sm);
        }
        .job-name-row label {
          font-size: 0.8rem;
          color: var(--text-light);
          min-width: 70px;
        }
        .job-name-display {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }
        .job-name-display span {
          font-weight: 500;
          color: var(--text-primary);
        }
        .job-name-edit {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }
        .job-name-edit input {
          flex: 1;
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
        }
        .btn-edit-small {
          background: transparent;
          color: var(--accent);
          border: 1px solid var(--accent);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .btn-edit-small:hover {
          background: var(--accent);
          color: white;
        }
        .btn-save-small {
          background: #4caf50;
          color: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .btn-save-small:hover {
          background: #388e3c;
        }
        .btn-cancel-small {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .btn-cancel-small:hover {
          background: #f5f5f5;
        }
        .invoice-status.draft {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .new-job-modal {
          background: white;
          border-radius: var(--radius-lg, 12px);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .new-job-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }
        .new-job-modal .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
        }
        .new-job-modal .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-light);
          line-height: 1;
        }
        .new-job-modal form {
          padding: 1.5rem;
        }
        .new-job-modal .form-group {
          margin-bottom: 1rem;
        }
        .new-job-modal .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }
        .new-job-modal .form-group input,
        .new-job-modal .form-group textarea {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
        }
        .new-job-modal .form-group input:focus,
        .new-job-modal .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
        }
        .new-job-modal .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .new-job-modal .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .new-job-modal .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.5rem;
        }
        .new-job-modal .btn {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .new-job-modal .btn-secondary {
          background: white;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
        }
        .new-job-modal .btn-primary {
          background: var(--accent);
          border: none;
          color: white;
        }
        .new-job-modal .btn-primary:hover {
          background: var(--accent-dark);
        }
        .new-job-modal .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 900px) {
          .submissions-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
