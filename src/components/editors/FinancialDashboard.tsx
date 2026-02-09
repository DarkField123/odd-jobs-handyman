import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  createdAt: { seconds: number };
  dueDate: string;
  payments?: Array<{ amount: number; date: string }>;
  amountPaid?: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: { seconds: number };
}

interface Submission {
  id: string;
  name: string;
  service: string;
  status: string;
  createdAt: { seconds: number };
}

type PeriodFilter = 'month' | 'last-month' | 'quarter' | 'tax-year' | 'all';

export default function FinancialDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const invoicesQuery = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const expensesQuery = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const submissionsQuery = query(collection(db, 'quoteSubmissions'), orderBy('createdAt', 'desc'));

    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Invoice[]);
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Expense[]);
    });

    const unsubSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Submission[]);
      setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubExpenses();
      unsubSubmissions();
    };
  }, []);

  // Get date range for current period
  const getDateRange = (periodFilter: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = now;

    switch (periodFilter) {
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end };
      }
      case 'last-month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end: endOfLastMonth };
      }
      case 'quarter': {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return { start: quarterStart, end };
      }
      case 'tax-year': {
        // UK tax year: 6 April to 5 April
        let taxYearStart = new Date(now.getFullYear(), 3, 6); // April 6
        if (now < taxYearStart) {
          taxYearStart.setFullYear(taxYearStart.getFullYear() - 1);
        }
        return { start: taxYearStart, end };
      }
      case 'all':
      default:
        return { start: new Date(2000, 0, 1), end };
    }
  };

  const isInPeriod = (timestamp: { seconds: number } | undefined, periodFilter: PeriodFilter): boolean => {
    if (!timestamp?.seconds) return false;
    const date = new Date(timestamp.seconds * 1000);
    const { start, end } = getDateRange(periodFilter);
    return date >= start && date <= end;
  };

  // Filter data by period
  const periodInvoices = invoices.filter((inv) => isInPeriod(inv.createdAt, period));
  const periodExpenses = expenses.filter((exp) => isInPeriod(exp.date, period));

  // Calculate metrics
  const totalIncome = periodInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const profit = totalIncome - totalExpenses;

  const outstandingAmount = periodInvoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total - (inv.amountPaid || 0), 0);

  const overdueCount = periodInvoices.filter((inv) => inv.status === 'overdue').length;

  const pendingQuotes = submissions.filter((s) => s.status === 'new' || s.status === 'in-progress').length;

  // Expense breakdown by category
  const expensesByCategory = periodExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Recent activity
  const recentActivity = [
    ...periodInvoices.slice(0, 5).map((inv) => ({
      type: 'invoice' as const,
      id: inv.id,
      title: `Invoice ${inv.invoiceNumber}`,
      subtitle: inv.customerName,
      amount: inv.total,
      status: inv.status,
      date: inv.createdAt,
    })),
    ...periodExpenses.slice(0, 5).map((exp) => ({
      type: 'expense' as const,
      id: exp.id,
      title: exp.description,
      subtitle: exp.category,
      amount: -exp.amount,
      status: null,
      date: exp.date,
    })),
  ]
    .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
    .slice(0, 8);

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}£${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (timestamp: { seconds: number }) => {
    if (!timestamp?.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getPeriodLabel = (p: PeriodFilter) => {
    switch (p) {
      case 'month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'quarter': return 'This Quarter';
      case 'tax-year': return 'This Tax Year';
      case 'all': return 'All Time';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style>{`
          .dashboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--text-secondary);
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="financial-dashboard">
      <style>{`
        .financial-dashboard {
          max-width: 1200px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .dashboard-header h2 {
          margin: 0;
          color: var(--text-primary);
        }
        .period-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .period-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.15s;
        }
        .period-btn:hover {
          border-color: var(--accent);
        }
        .period-btn.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-value.positive { color: #2e7d32; }
        .stat-value.negative { color: #d32f2f; }
        .stat-value.warning { color: #ed6c02; }
        .stat-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .dashboard-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .card-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-header a {
          font-size: 0.85rem;
          color: var(--accent);
          text-decoration: none;
        }
        .card-content {
          padding: 1rem 1.25rem;
        }
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          padding: 0.6rem 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.9rem;
        }
        .breakdown-item:last-child {
          border-bottom: none;
        }
        .breakdown-label {
          color: var(--text-secondary);
        }
        .breakdown-value {
          font-weight: 500;
          color: var(--text-primary);
        }
        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-info {
          flex: 1;
        }
        .activity-title {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .activity-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .activity-amount {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .activity-amount.income { color: #2e7d32; }
        .activity-amount.expense { color: #d32f2f; }
        .status-badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-left: 0.5rem;
        }
        .status-badge.paid { background: #e8f5e9; color: #2e7d32; }
        .status-badge.pending { background: #fff3e0; color: #ed6c02; }
        .status-badge.overdue { background: #ffebee; color: #d32f2f; }
        .status-badge.draft { background: #f5f5f5; color: #757575; }
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .quick-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s;
        }
        .quick-action:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .quick-action-icon {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .quick-action-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="dashboard-header">
        <h2>Financial Dashboard</h2>
        <div className="period-selector">
          {(['month', 'last-month', 'quarter', 'tax-year', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Income</div>
          <div className={`stat-value ${totalIncome > 0 ? 'positive' : ''}`}>
            {formatCurrency(totalIncome)}
          </div>
          <div className="stat-sub">{periodInvoices.filter(i => i.status === 'paid').length} paid invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expenses</div>
          <div className="stat-value">{formatCurrency(totalExpenses)}</div>
          <div className="stat-sub">{periodExpenses.length} expenses recorded</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit</div>
          <div className={`stat-value ${profit >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(profit)}
          </div>
          <div className="stat-sub">Income minus expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className={`stat-value ${outstandingAmount > 0 ? 'warning' : ''}`}>
            {formatCurrency(outstandingAmount)}
          </div>
          <div className="stat-sub">
            {overdueCount > 0 ? `${overdueCount} overdue` : 'No overdue invoices'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Quotes</div>
          <div className="stat-value">{pendingQuotes}</div>
          <div className="stat-sub">Awaiting response</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <span>Expenses by Category</span>
            <a href="/account/editor/expenses">View all</a>
          </div>
          <div className="card-content">
            {sortedCategories.length > 0 ? (
              sortedCategories.map(([category, amount]) => (
                <div key={category} className="breakdown-item">
                  <span className="breakdown-label">{category}</span>
                  <span className="breakdown-value">{formatCurrency(amount)}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No expenses this period</div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <span>Recent Activity</span>
          </div>
          <div className="card-content">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="activity-item">
                  <div className="activity-info">
                    <div className="activity-title">
                      {item.title}
                      {item.status && (
                        <span className={`status-badge ${item.status}`}>{item.status}</span>
                      )}
                    </div>
                    <div className="activity-subtitle">
                      {item.subtitle} • {formatDate(item.date)}
                    </div>
                  </div>
                  <div className={`activity-amount ${item.amount >= 0 ? 'income' : 'expense'}`}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No activity this period</div>
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <a href="/account/editor/quotes" className="quick-action">
          <span className="quick-action-icon">📋</span>
          <span className="quick-action-label">View Quotes</span>
        </a>
        <a href="/account/editor/invoices" className="quick-action">
          <span className="quick-action-icon">🧾</span>
          <span className="quick-action-label">Manage Invoices</span>
        </a>
        <a href="/account/editor/expenses" className="quick-action">
          <span className="quick-action-icon">💰</span>
          <span className="quick-action-label">Add Expense</span>
        </a>
        <a href="/account/editor/reports" className="quick-action">
          <span className="quick-action-icon">📈</span>
          <span className="quick-action-label">View Reports</span>
        </a>
      </div>
    </div>
  );
}
