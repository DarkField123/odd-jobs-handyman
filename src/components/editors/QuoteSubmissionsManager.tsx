import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: 'new' | 'contacted' | 'quoted' | 'completed' | 'declined';
  createdAt: { seconds: number };
}

export default function QuoteSubmissionsManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
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
                <div className="submission-service">{sub.service}</div>
                <div className="submission-date">{formatDate(sub.createdAt)}</div>
              </div>
            ))
          )}
        </div>

        {selectedSubmission && (
          <div className="submission-detail">
            <h2>{selectedSubmission.name}</h2>
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
              <button className="btn btn-danger" onClick={() => handleDelete(selectedSubmission.id)}>
                Delete
              </button>
            </div>
          </div>
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
        @media (max-width: 900px) {
          .submissions-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
