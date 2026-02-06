import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';

// Admin UIDs — must match the list in firestore.rules
const ADMIN_UIDS = ['TSJwRbSJjaQohlxB0nfJzmb0uhI2'];

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser ? ADMIN_UIDS.includes(currentUser.uid) : false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e0e0e0',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Login Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Please log in to access this area.
        </p>
        <a
          href="/account/login"
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--accent)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}
        >
          Log In
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You don't have permission to access this area.
        </p>
        <a
          href="/"
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--accent)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}
        >
          Go Home
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
