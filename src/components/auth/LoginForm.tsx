import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/account/editor';
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style>{`
        .login-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg-light);
        }
        .login-card {
          background: var(--bg-white, white);
          padding: 2.5rem;
          border-radius: var(--radius-lg, 12px);
          box-shadow: var(--shadow-md, 0 4px 20px rgba(0, 0, 0, 0.1));
          width: 100%;
          max-width: 400px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-header h1 {
          font-size: 1.75rem;
          color: var(--text-primary);
          margin: 0 0 0.5rem;
        }
        .login-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .form-group input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-light, #e0e0e0);
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .error-message {
          padding: 1rem;
          background: #ffebee;
          border: 1px solid #f44336;
          border-radius: var(--radius-md, 8px);
          color: #c62828;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md, 8px);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .submit-btn:hover {
          opacity: 0.9;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .back-link {
          text-align: center;
          margin-top: 1.5rem;
        }
        .back-link a {
          color: var(--text-secondary);
          text-decoration: none;
        }
        .back-link a:hover {
          color: var(--accent);
        }
      `}</style>

      <div className="login-card">
        <div className="login-header">
          <h1>Admin Login</h1>
          <p>Sign in to access the admin dashboard.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="back-link">
          <a href="/">&larr; Back to website</a>
        </p>
      </div>
    </div>
  );
}
