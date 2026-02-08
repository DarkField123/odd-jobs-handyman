import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
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

export default function QuoteSubmissionsManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingJobName, setEditingJobName] = useState(false);
  const [jobNameValue, setJobNameValue] = useState('');

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

  const filteredSubmissions = filter === 'all'
    ? submissions
    : submissions.filter(s => s.status === filter);

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

  return (
    <div className="submissions-manager">
      <div className="manager-header">
        <h1>Quote Submissions</h1>
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
            onClose={() => setShowInvoiceModal(false)}
            onCreated={() => {/* Invoices update via onSnapshot */}}
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
          margin: 0 0 1rem;
          color: var(--text-primary);
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
        @media (max-width: 900px) {
          .submissions-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
