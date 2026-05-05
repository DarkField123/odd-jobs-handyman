import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase/client';
import { updatePassword, type User } from 'firebase/auth';

export default function ProfileManager() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth?.currentUser) {
      setUser(auth.currentUser);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    try {
      if (user) {
        await updatePassword(user, newPassword);
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-manager">
      <style>{`
        .profile-manager {
          max-width: 600px;
        }
        .profile-header {
          margin-bottom: 2rem;
        }
        .profile-header h2 {
          margin: 0;
          color: var(--text-primary);
        }
        .profile-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .section-icon {
          font-size: 1.25rem;
        }
        .section-title h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .info-value {
          color: var(--text-primary);
          font-weight: 500;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .form-group input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.95rem;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .save-btn {
          padding: 0.6rem 1.25rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .save-btn:hover {
          opacity: 0.9;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .message {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .message.success {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .message.error {
          background: #ffebee;
          color: #c62828;
        }
      `}</style>

      <div className="profile-header">
        <h2>Profile</h2>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="profile-section">
        <div className="section-title">
          <span className="section-icon">👤</span>
          <h3>Account Information</h3>
        </div>
        <div className="info-row">
          <span className="info-label">Email</span>
          <span className="info-value">{user?.email || 'Not set'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">User ID</span>
          <span className="info-value" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {user?.uid || 'Unknown'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Last Sign In</span>
          <span className="info-value">
            {user?.metadata.lastSignInTime
              ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Unknown'}
          </span>
        </div>
      </div>

      <div className="profile-section">
        <div className="section-title">
          <span className="section-icon">🔐</span>
          <h3>Change Password</h3>
        </div>
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
