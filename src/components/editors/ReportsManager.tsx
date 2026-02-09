import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  createdAt: { seconds: number };
  dueDate: string;
  includeVat?: boolean;
  vatRate?: number;
  vatAmount?: number;
  payments?: Array<{ amount: number; date: string; method: string }>;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  supplier?: string;
  vatAmount?: number;
  date: { seconds: number };
}

type ReportType = 'income' | 'expenses' | 'profit-loss' | 'vat' | 'tax-year';
type PeriodType = 'month' | 'quarter' | 'tax-year' | 'custom';

export default function ReportsManager() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reportType, setReportType] = useState<ReportType>('profit-loss');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const invoicesQuery = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const expensesQuery = query(collection(db, 'expenses'), orderBy('date', 'desc'));

    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Invoice[]);
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Expense[]);
      setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubExpenses();
    };
  }, []);

  // Calculate date range based on period
  const getDateRange = (): { start: Date; end: Date; label: string } => {
    const now = new Date();

    switch (periodType) {
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start,
          end,
          label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        };
      }
      case 'quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStart, 1);
        const end = new Date(now.getFullYear(), quarterStart + 3, 0);
        return {
          start,
          end,
          label: `Q${Math.floor(quarterStart / 3) + 1} ${now.getFullYear()}`,
        };
      }
      case 'tax-year': {
        let taxYearStart = new Date(now.getFullYear(), 3, 6); // April 6
        if (now < taxYearStart) {
          taxYearStart.setFullYear(taxYearStart.getFullYear() - 1);
        }
        const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 3, 5);
        return {
          start: taxYearStart,
          end: taxYearEnd,
          label: `Tax Year ${taxYearStart.getFullYear()}/${taxYearStart.getFullYear() + 1}`,
        };
      }
      case 'custom': {
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
          label: `${new Date(customStartDate).toLocaleDateString('en-GB')} - ${new Date(customEndDate).toLocaleDateString('en-GB')}`,
        };
      }
    }
  };

  const { start: periodStart, end: periodEnd, label: periodLabel } = getDateRange();

  const isInPeriod = (timestamp: { seconds: number } | undefined): boolean => {
    if (!timestamp?.seconds) return false;
    const date = new Date(timestamp.seconds * 1000);
    return date >= periodStart && date <= periodEnd;
  };

  // Filter data by period
  const periodInvoices = invoices.filter((inv) => isInPeriod(inv.createdAt));
  const periodExpenses = expenses.filter((exp) => isInPeriod(exp.date));

  // Calculations
  const paidInvoices = periodInvoices.filter((inv) => inv.status === 'paid');
  const totalIncome = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const profit = totalIncome - totalExpenses;

  const vatCollected = paidInvoices
    .filter((inv) => inv.includeVat)
    .reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
  const vatPaid = periodExpenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
  const vatDue = vatCollected - vatPaid;

  const expensesByCategory = periodExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  const formatDate = (timestamp: { seconds: number }) => {
    if (!timestamp?.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // CSV Export
  const exportCSV = () => {
    let csv = '';
    const filename = `${reportType}-report-${periodStart.toISOString().split('T')[0]}.csv`;

    switch (reportType) {
      case 'income':
        csv = 'Invoice Number,Customer,Date,Subtotal,VAT,Total,Status\n';
        periodInvoices.forEach((inv) => {
          csv += `"${inv.invoiceNumber}","${inv.customerName}","${formatDate(inv.createdAt)}",${inv.subtotal || inv.total},${inv.vatAmount || 0},${inv.total},"${inv.status}"\n`;
        });
        break;

      case 'expenses':
        csv = 'Date,Description,Category,Supplier,Amount,VAT\n';
        periodExpenses.forEach((exp) => {
          csv += `"${formatDate(exp.date)}","${exp.description}","${exp.category}","${exp.supplier || ''}",${exp.amount},${exp.vatAmount || 0}\n`;
        });
        break;

      case 'profit-loss':
        csv = 'Category,Amount\n';
        csv += `"Total Income",${totalIncome}\n`;
        csv += `"Total Expenses",${totalExpenses}\n`;
        csv += `"Net Profit",${profit}\n`;
        csv += '\nExpense Breakdown\n';
        csv += 'Category,Amount\n';
        Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .forEach(([cat, amount]) => {
            csv += `"${cat}",${amount}\n`;
          });
        break;

      case 'vat':
        csv = 'Description,Amount\n';
        csv += `"VAT Collected (Output VAT)",${vatCollected}\n`;
        csv += `"VAT Paid (Input VAT)",${vatPaid}\n`;
        csv += `"VAT Due to HMRC",${vatDue}\n`;
        break;

      case 'tax-year':
        csv = 'UK Self Assessment Summary\n';
        csv += `"Period","${periodLabel}"\n\n`;
        csv += 'Income\n';
        csv += `"Total Turnover",${totalIncome}\n\n`;
        csv += 'Expenses by Category\n';
        Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .forEach(([cat, amount]) => {
            csv += `"${cat}",${amount}\n`;
          });
        csv += `\n"Total Expenses",${totalExpenses}\n`;
        csv += `"Net Profit/Loss",${profit}\n`;
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderReport = () => {
    switch (reportType) {
      case 'income':
        return (
          <div className="report-content">
            <h3>Income Report</h3>
            <p className="report-period">{periodLabel}</p>

            <div className="report-summary">
              <div className="summary-item">
                <span>Total Invoices</span>
                <strong>{periodInvoices.length}</strong>
              </div>
              <div className="summary-item">
                <span>Paid</span>
                <strong>{paidInvoices.length}</strong>
              </div>
              <div className="summary-item">
                <span>Total Income</span>
                <strong className="positive">{formatCurrency(totalIncome)}</strong>
              </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {periodInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td>{formatDate(inv.createdAt)}</td>
                    <td>{formatCurrency(inv.total)}</td>
                    <td>
                      <span className={`status-badge ${inv.status}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'expenses':
        return (
          <div className="report-content">
            <h3>Expenses Report</h3>
            <p className="report-period">{periodLabel}</p>

            <div className="report-summary">
              <div className="summary-item">
                <span>Total Expenses</span>
                <strong>{formatCurrency(totalExpenses)}</strong>
              </div>
              <div className="summary-item">
                <span>VAT Reclaimable</span>
                <strong>{formatCurrency(vatPaid)}</strong>
              </div>
            </div>

            <h4>By Category</h4>
            <div className="category-breakdown">
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <div key={cat} className="category-row">
                    <span>{cat}</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>

            <h4>All Expenses</h4>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {periodExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{formatDate(exp.date)}</td>
                    <td>{exp.description}</td>
                    <td>{exp.category}</td>
                    <td>{formatCurrency(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'profit-loss':
        return (
          <div className="report-content">
            <h3>Profit & Loss Statement</h3>
            <p className="report-period">{periodLabel}</p>

            <div className="pl-section">
              <h4>Income</h4>
              <div className="pl-row">
                <span>Sales Revenue</span>
                <span>{formatCurrency(totalIncome)}</span>
              </div>
              <div className="pl-row total">
                <span>Total Income</span>
                <span className="positive">{formatCurrency(totalIncome)}</span>
              </div>
            </div>

            <div className="pl-section">
              <h4>Expenses</h4>
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <div key={cat} className="pl-row">
                    <span>{cat}</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))}
              <div className="pl-row total">
                <span>Total Expenses</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
            </div>

            <div className="pl-section final">
              <div className="pl-row total">
                <span>Net Profit / (Loss)</span>
                <span className={profit >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>
          </div>
        );

      case 'vat':
        return (
          <div className="report-content">
            <h3>VAT Summary</h3>
            <p className="report-period">{periodLabel}</p>

            <div className="vat-summary">
              <div className="vat-row">
                <div className="vat-item">
                  <span className="vat-label">VAT Collected (Output VAT)</span>
                  <span className="vat-desc">VAT charged on your invoices</span>
                </div>
                <span className="vat-amount">{formatCurrency(vatCollected)}</span>
              </div>
              <div className="vat-row">
                <div className="vat-item">
                  <span className="vat-label">VAT Paid (Input VAT)</span>
                  <span className="vat-desc">VAT paid on business expenses</span>
                </div>
                <span className="vat-amount">{formatCurrency(vatPaid)}</span>
              </div>
              <div className="vat-row total">
                <div className="vat-item">
                  <span className="vat-label">VAT Due to HMRC</span>
                  <span className="vat-desc">
                    {vatDue >= 0 ? 'Amount to pay' : 'Amount to reclaim'}
                  </span>
                </div>
                <span className={`vat-amount ${vatDue >= 0 ? 'negative' : 'positive'}`}>
                  {formatCurrency(Math.abs(vatDue))}
                </span>
              </div>
            </div>

            <div className="vat-note">
              <strong>Note:</strong> This is an indicative summary. Please consult with your accountant for official VAT returns.
            </div>
          </div>
        );

      case 'tax-year':
        return (
          <div className="report-content">
            <h3>Tax Year Summary</h3>
            <p className="report-period">{periodLabel}</p>
            <p className="report-desc">Summary for UK Self Assessment</p>

            <div className="tax-section">
              <h4>Turnover (Sales)</h4>
              <div className="tax-row highlight">
                <span>Total Turnover</span>
                <span>{formatCurrency(totalIncome)}</span>
              </div>
            </div>

            <div className="tax-section">
              <h4>Allowable Business Expenses</h4>
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <div key={cat} className="tax-row">
                    <span>{cat}</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))}
              <div className="tax-row highlight">
                <span>Total Expenses</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
            </div>

            <div className="tax-section">
              <h4>Net Profit</h4>
              <div className="tax-row highlight final">
                <span>Net Business Profit / (Loss)</span>
                <span className={profit >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>

            <div className="tax-note">
              <strong>Important:</strong> This summary is for reference only. Ensure you keep proper records and receipts for at least 6 years. Consult with a qualified accountant for your Self Assessment tax return.
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading reports...</p>
        <style>{`
          .loading-state {
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
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="reports-manager">
      <style>{`
        .reports-manager {
          max-width: 1000px;
        }
        .reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .reports-header h2 {
          margin: 0;
          color: var(--text-primary);
        }
        .export-btn {
          padding: 0.5rem 1rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .export-btn:hover {
          opacity: 0.9;
        }
        .controls-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 700px) {
          .controls-section {
            grid-template-columns: 1fr;
          }
        }
        .control-group {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
        }
        .control-group label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .report-type-btns, .period-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .type-btn, .period-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.15s;
        }
        .type-btn:hover, .period-btn:hover {
          border-color: var(--accent);
        }
        .type-btn.active, .period-btn.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .custom-dates {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .custom-dates input {
          padding: 0.4rem 0.6rem;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.85rem;
        }
        .report-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .report-content {
          padding: 1.5rem;
        }
        .report-content h3 {
          margin: 0 0 0.25rem;
          color: var(--text-primary);
        }
        .report-period {
          color: var(--text-secondary);
          margin: 0 0 1.5rem;
          font-size: 0.9rem;
        }
        .report-desc {
          color: var(--text-secondary);
          margin: 0.25rem 0 1.5rem;
          font-size: 0.85rem;
        }
        .report-content h4 {
          margin: 1.5rem 0 1rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
          text-transform: uppercase;
        }
        .report-summary {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .summary-item span {
          display: block;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .summary-item strong {
          font-size: 1.5rem;
          color: var(--text-primary);
        }
        .summary-item strong.positive { color: #2e7d32; }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .report-table th {
          text-align: left;
          padding: 0.75rem;
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 0.75rem;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }
        .report-table td {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }
        .status-badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.paid { background: #e8f5e9; color: #2e7d32; }
        .status-badge.pending { background: #fff3e0; color: #ed6c02; }
        .status-badge.overdue { background: #ffebee; color: #d32f2f; }
        .status-badge.draft { background: #f5f5f5; color: #757575; }
        .category-breakdown {
          background: var(--bg-primary);
          border-radius: 6px;
          padding: 0.5rem 0;
        }
        .category-row {
          display: flex;
          justify-content: space-between;
          padding: 0.6rem 1rem;
          border-bottom: 1px solid var(--border);
        }
        .category-row:last-child {
          border-bottom: none;
        }
        .pl-section {
          margin-bottom: 1.5rem;
        }
        .pl-section.final {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 2px solid var(--border);
        }
        .pl-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.95rem;
        }
        .pl-row.total {
          font-weight: 600;
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
          margin-top: 0.5rem;
        }
        .positive { color: #2e7d32; }
        .negative { color: #d32f2f; }
        .vat-summary {
          background: var(--bg-primary);
          border-radius: 8px;
          overflow: hidden;
        }
        .vat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
        }
        .vat-row:last-child {
          border-bottom: none;
        }
        .vat-row.total {
          background: var(--bg-secondary);
        }
        .vat-label {
          display: block;
          font-weight: 500;
          color: var(--text-primary);
        }
        .vat-desc {
          display: block;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .vat-amount {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .vat-note, .tax-note {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #fff3e0;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #795548;
        }
        .tax-section {
          margin-bottom: 1.5rem;
        }
        .tax-row {
          display: flex;
          justify-content: space-between;
          padding: 0.6rem 0;
          border-bottom: 1px solid var(--border);
        }
        .tax-row.highlight {
          font-weight: 600;
          background: var(--bg-primary);
          padding: 0.75rem 1rem;
          margin: 0.5rem -1rem;
          border-radius: 4px;
        }
        .tax-row.final {
          font-size: 1.1rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="reports-header">
        <h2>Reports</h2>
        <button className="export-btn" onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <div className="controls-section">
        <div className="control-group">
          <label>Report Type</label>
          <div className="report-type-btns">
            {([
              { value: 'profit-loss', label: 'Profit & Loss' },
              { value: 'income', label: 'Income' },
              { value: 'expenses', label: 'Expenses' },
              { value: 'vat', label: 'VAT' },
              { value: 'tax-year', label: 'Tax Year' },
            ] as { value: ReportType; label: string }[]).map((rt) => (
              <button
                key={rt.value}
                className={`type-btn ${reportType === rt.value ? 'active' : ''}`}
                onClick={() => setReportType(rt.value)}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Period</label>
          <div className="period-btns">
            {([
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'tax-year', label: 'Tax Year' },
              { value: 'custom', label: 'Custom' },
            ] as { value: PeriodType; label: string }[]).map((p) => (
              <button
                key={p.value}
                className={`period-btn ${periodType === p.value ? 'active' : ''}`}
                onClick={() => setPeriodType(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodType === 'custom' && (
            <div className="custom-dates">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="report-container">
        {renderReport()}
      </div>
    </div>
  );
}
