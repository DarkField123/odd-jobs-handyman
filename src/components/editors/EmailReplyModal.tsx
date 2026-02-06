import { useState } from 'react';
import { db, auth } from '../../lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface EmailReplyModalProps {
  submissionId: string;
  customerName: string;
  customerEmail: string;
  service: string;
  onClose: () => void;
  onSent: () => void;
}

export function EmailReplyModal({
  submissionId,
  customerName,
  customerEmail,
  service,
  onClose,
  onSent,
}: EmailReplyModalProps) {
  const [subject, setSubject] = useState(`Re: Your ${service} Quote Request - Odd Jobs`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!body.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!db) {
      setError('Database not available');
      return;
    }

    setSending(true);
    setError('');

    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Add reply to subcollection - Cloud Function will handle sending
      await addDoc(collection(db, 'submissions', submissionId, 'emailReplies'), {
        subject: subject.trim(),
        body: body.trim(),
        sentBy: user.uid,
        sentByEmail: user.email || 'admin@oddjobs.com',
        createdAt: serverTimestamp(),
        status: 'pending',
      });

      onSent();
      onClose();
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Reply to {customerName}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="email-to">To</label>
            <input id="email-to" type="text" value={customerEmail} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="email-subject">Subject</label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email-body">Message</label>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Type your reply..."
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !body.trim()}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #f0f0f0;
          color: #333;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
        }

        .form-group input:disabled {
          background: #f5f5f5;
          color: #666;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 150px;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.9rem;
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #fef2f2;
          border-radius: 6px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
          background: #fafafa;
          border-radius: 0 0 12px 12px;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .btn-secondary {
          background: #f5f5f5;
          border: 1px solid #ddd;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e8e8e8;
        }

        .btn-primary {
          background: var(--accent, #e53935);
          border: none;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-dark, #c62828);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
