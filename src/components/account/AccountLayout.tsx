import { useState, useEffect, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';
import { config } from '../../lib/config';

interface AccountLayoutProps {
  children: ReactNode;
  currentPath?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

interface NavSection {
  id: string;
  label?: string;
  icon?: string;
  collapsible?: boolean;
  alwaysShow?: boolean;
  feature?: keyof typeof config.features;
  showIf?: (keyof typeof config.features)[];
  items: NavItem[];
}

// Define nav sections outside component so we can use them to compute initial state
const getNavSections = (): NavSection[] => [
  {
    id: 'main',
    items: [
      { href: '/account/editor', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    id: 'quotes',
    feature: 'quotes',
    items: [
      { href: '/account/editor/quotes', label: 'Quote Requests', icon: '📋' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: '🧾',
    collapsible: true,
    feature: 'accounting',
    items: [
      { href: '/account/editor/invoices', label: 'Invoices' },
      { href: '/account/editor/expenses', label: 'Expenses' },
      { href: '/account/editor/reports', label: 'Reports' },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: '📁',
    collapsible: true,
    feature: 'portfolio',
    items: [
      { href: '/account/editor/projects', label: 'Projects' },
      { href: '/account/editor/testimonials', label: 'Testimonials' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📝',
    collapsible: true,
    showIf: ['blog', 'gallery'],
    items: [
      ...(config.features.blog ? [{ href: '/account/editor/blog', label: 'Blog' }] : []),
      ...(config.features.gallery ? [{ href: '/account/editor/gallery', label: 'Gallery' }] : []),
    ],
  },
  {
    id: 'services',
    feature: 'services',
    items: [
      { href: '/account/editor/skills', label: 'Services', icon: '🔧' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: '👤',
    collapsible: true,
    alwaysShow: true,
    items: [
      { href: '/account/editor/settings', label: 'Business Settings' },
      { href: '/account/editor/profile', label: 'Profile' },
    ],
  },
];

// Find which sections contain the current path
const getActiveSections = (path: string): Set<string> => {
  const sections = getNavSections();
  const active = new Set<string>();

  for (const section of sections) {
    if (section.collapsible && section.items.some(item => item.href === path)) {
      active.add(section.id);
    }
  }

  return active;
};

export function AccountLayout({ children, currentPath = '' }: AccountLayoutProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => getActiveSections(currentPath));

  // Keep sections open when navigating to pages within them
  useEffect(() => {
    const activeSections = getActiveSections(currentPath);
    if (activeSections.size > 0) {
      setExpandedSections(prev => {
        const next = new Set(prev);
        activeSections.forEach(id => next.add(id));
        return next;
      });
    }
  }, [currentPath]);

  const navSections = getNavSections();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const shouldShowSection = (section: NavSection): boolean => {
    if (section.alwaysShow) return true;
    if (section.feature && !config.features[section.feature]) return false;
    if (section.showIf) {
      return section.showIf.some((f) => config.features[f]);
    }
    return true;
  };

  const isPathActive = (href: string) => currentPath === href;
  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => isPathActive(item.href));

  return (
    <div className="account-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="/" className="logo">
            <span className="logo-icon">{config.projectIcon}</span>
            <span>{config.projectName}</span>
          </a>
          <span className="badge">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {navSections.filter(shouldShowSection).map((section) => (
            <div key={section.id} className="nav-section">
              {section.collapsible && section.label ? (
                <>
                  <button
                    className={`section-header ${isSectionActive(section) ? 'has-active' : ''}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="nav-icon">{section.icon}</span>
                    <span>{section.label}</span>
                    <span className={`chevron ${expandedSections.has(section.id) ? 'expanded' : ''}`}>
                      ▾
                    </span>
                  </button>
                  <div className={`section-items ${expandedSections.has(section.id) ? 'expanded' : ''}`}>
                    {section.items.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`nav-item sub-item ${isPathActive(item.href) ? 'active' : ''}`}
                      >
                        <span>{item.label}</span>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                section.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isPathActive(item.href) ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ))
              )}
            </div>
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
          overflow-y: auto;
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
          padding: 0.5rem 0;
        }

        .nav-section {
          margin-bottom: 0.25rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .section-header:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-white);
        }

        .section-header.has-active {
          color: var(--accent-light);
        }

        .chevron {
          margin-left: auto;
          font-size: 0.8rem;
          transition: transform 0.2s ease;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .section-items {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.2s ease;
        }

        .section-items.expanded {
          max-height: 200px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .nav-item.sub-item {
          padding-left: 3.5rem;
          font-size: 0.9rem;
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
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
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
            max-height: 300px;
            overflow-y: auto;
          }

          .main-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
