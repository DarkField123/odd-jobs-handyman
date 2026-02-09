import { type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';

interface AccountLayoutProps {
  children: ReactNode;
  currentPath?: string;
}

const menuItems = [
  { href: '/account/editor', label: 'Dashboard', icon: '📊' },
  { href: '/account/editor/skills', label: 'Services', icon: '🔧' },
  { href: '/account/editor/projects', label: 'Projects', icon: '📁' },
  { href: '/account/editor/quotes', label: 'Quote Requests', icon: '📋' },
  { href: '/account/editor/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/account/editor/expenses', label: 'Expenses', icon: '💰' },
  { href: '/account/editor/reports', label: 'Reports', icon: '📈' },
  { href: '/account/editor/testimonials', label: 'Testimonials', icon: '⭐' },
  { href: '/account/editor/settings', label: 'Settings', icon: '⚙️' },
];

export function AccountLayout({ children, currentPath = '' }: AccountLayoutProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="account-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="/" className="logo">
            <span className="logo-icon">🔧</span>
            <span>Odd Jobs</span>
          </a>
          <span className="badge">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`nav-item ${currentPath === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/" className="nav-item view-site">
            <span className="nav-icon">🌐</span>
            <span>View Site</span>
          </a>
          <button onClick={handleSignOut} className="sign-out-btn">
            <span className="nav-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <style>{`
        .account-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-light);
        }

        .sidebar {
          width: 260px;
          background: var(--bg-dark);
          color: var(--text-white);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-white);
          text-decoration: none;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          background: var(--accent);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 4px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-white);
        }

        .nav-item.active {
          background: rgba(255, 255, 255, 0.1);
          color: var(--accent-light);
          border-left-color: var(--accent);
        }

        .nav-icon {
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 1rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .view-site {
          color: rgba(255, 255, 255, 0.5);
        }

        .sign-out-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .sign-out-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ff6b6b;
        }

        .main-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .account-layout {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
          }

          .sidebar-nav {
            display: flex;
            flex-wrap: wrap;
            padding: 0.5rem;
          }

          .nav-item {
            padding: 0.5rem 1rem;
            border-left: none;
            border-radius: 4px;
          }

          .nav-item.active {
            border-left: none;
            background: var(--accent);
          }

          .sidebar-footer {
            display: flex;
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .sidebar-footer .nav-item,
          .sign-out-btn {
            flex: 1;
            justify-content: center;
            border-left: none;
          }

          .main-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
