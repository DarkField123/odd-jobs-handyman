import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { InvoiceBuilder } from './InvoiceBuilder';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank' | 'card' | 'cheque';
  reference?: string;
  note?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  submissionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  notes: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  createdAt: { seconds: number };
  emailStatus?: {
    status: 'sent' | 'failed';
  };
  // VAT fields
  includeVat?: boolean;
  vatRate?: number;
  vatAmount?: number;
  // Payment tracking
  payments?: Payment[];
  amountPaid?: number;
  // Revision tracking
  originalInvoiceId?: string;
  revisionNumber?: number;
  revisionReason?: string;
  revisionDate?: { seconds: number };
}

export default function InvoicesManager() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'cheque'>('bank');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];
      setInvoices(data);
    }, (error) => {
      console.error('Error fetching invoices:', error);
      alert(`Error loading invoices: ${error.message}`);
    });
    return () => unsubscribe();
  }, []);

  // Keep selectedInvoice in sync with invoices data
  useEffect(() => {
    if (selectedInvoice) {
      const updated = invoices.find(inv => inv.id === selectedInvoice.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedInvoice)) {
        setSelectedInvoice(updated);
      }
    }
  }, [invoices]);

  // Get unique years from invoices
  const years = [...new Set(invoices.map((inv) => {
    if (!inv.createdAt?.seconds) return null;
    return new Date(inv.createdAt.seconds * 1000).getFullYear();
  }).filter(Boolean))].sort((a, b) => (b as number) - (a as number));

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (yearFilter !== 'all') {
      const year = inv.createdAt?.seconds
        ? new Date(inv.createdAt.seconds * 1000).getFullYear()
        : null;
      if (year !== parseInt(yearFilter)) return false;
    }
    // Search filter - check name or invoice number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = inv.customerName.toLowerCase().includes(query);
      const matchesNumber = inv.invoiceNumber.toLowerCase().includes(query);
      if (!matchesName && !matchesNumber) return false;
    }
    return true;
  });

  // Calculate totals for filtered invoices
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = filteredInvoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0);

  const formatDate = (timestamp: { seconds: number }) => {
    if (!timestamp?.seconds) return 'Unknown';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), { status: newStatus });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'pending',
        sendEmail: true
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
  };

  const handleCreateRevision = async () => {
    if (!selectedInvoice || !revisionReason.trim()) return;

    try {
      // Count existing revisions for this invoice chain
      const originalId = selectedInvoice.originalInvoiceId || selectedInvoice.id;
      const existingRevisions = invoices.filter(
        inv => inv.originalInvoiceId === originalId || inv.id === originalId
      );
      const newRevisionNumber = existingRevisions.length;

      // Generate new invoice number with revision suffix
      const baseNumber = selectedInvoice.invoiceNumber.replace(/-R\d+$/, '');
      const newInvoiceNumber = `${baseNumber}-R${newRevisionNumber}`;

      // Create the revision invoice
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber: newInvoiceNumber,
        submissionId: selectedInvoice.submissionId,
        customerName: selectedInvoice.customerName,
        customerEmail: selectedInvoice.customerEmail,
        customerPhone: selectedInvoice.customerPhone,
        lineItems: selectedInvoice.lineItems,
        subtotal: selectedInvoice.subtotal,
        total: selectedInvoice.total,
        notes: selectedInvoice.notes,
        dueDate: selectedInvoice.dueDate,
        status: 'draft', // Revisions start as draft
        originalInvoiceId: originalId,
        revisionNumber: newRevisionNumber,
        revisionReason: revisionReason.trim(),
        revisionDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setShowRevisionModal(false);
      setRevisionReason('');
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error creating revision:', error);
      alert('Failed to create revision. Please try again.');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      alert('Paid invoices cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'invoices', invoice.id));
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      const existingPayments = selectedInvoice.payments || [];
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        amount,
        date: paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        note: paymentNote.trim() || undefined,
      };

      const updatedPayments = [...existingPayments, newPayment];
      const newAmountPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const amountDue = selectedInvoice.total - newAmountPaid;

      // Auto-update status to paid if fully paid
      const newStatus = amountDue <= 0 ? 'paid' : selectedInvoice.status;

      await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
        payments: updatedPayments,
        amountPaid: newAmountPaid,
        status: newStatus,
      });

      // Reset form
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('bank');
      setPaymentReference('');
      setPaymentNote('');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const getAmountDue = (invoice: Invoice) => {
    const paid = invoice.amountPaid || 0;
    return invoice.total - paid;
  };

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Email', 'Phone', 'Total', 'Status', 'Due Date'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.createdAt),
      inv.customerName,
      inv.customerEmail,
      inv.customerPhone,
      `£${inv.total.toFixed(2)}`,
      inv.status,
      new Date(inv.dueDate).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices-${statusFilter}-${yearFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const filterLabel = `${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Invoices${yearFilter !== 'all' ? ` - ${yearFilter}` : ''}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filterLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e53935; }
          .logo { font-size: 28px; font-weight: bold; color: #e53935; }
          .logo-sub { font-size: 12px; color: #666; }
          .report-title { text-align: right; }
          .report-title h1 { font-size: 24px; color: #333; }
          .report-title p { color: #666; font-size: 14px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-card { flex: 1; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: center; }
          .summary-card h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
          .summary-card .amount { font-size: 24px; font-weight: bold; }
          .summary-card.total .amount { color: #333; }
          .summary-card.paid .amount { color: #2e7d32; }
          .summary-card.pending .amount { color: #e65100; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 11px; text-transform: uppercase; color: #666; }
          td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .text-right { text-align: right; }
          .status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .status-pending { background: #fff3e0; color: #e65100; }
          .status-paid { background: #e8f5e9; color: #2e7d32; }
          .status-overdue { background: #ffebee; color: #c62828; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
          @media print { body { padding: 20px; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Odd Jobs</div>
            <div class="logo-sub">Professional Handyman Services</div>
          </div>
          <div class="report-title">
            <h1>Invoice Report</h1>
            <p>${filterLabel}</p>
            <p>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div class="summary">
          <div class="summary-card total">
            <h3>Total</h3>
            <div class="amount">&pound;${totalAmount.toFixed(2)}</div>
            <p>${filteredInvoices.length} invoices</p>
          </div>
          <div class="summary-card paid">
            <h3>Paid</h3>
            <div class="amount">&pound;${paidAmount.toFixed(2)}</div>
            <p>${filteredInvoices.filter(i => i.status === 'paid').length} invoices</p>
          </div>
          <div class="summary-card pending">
            <h3>Outstanding</h3>
            <div class="amount">&pound;${pendingAmount.toFixed(2)}</div>
            <p>${filteredInvoices.filter(i => i.status !== 'paid').length} invoices</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th class="text-right">Amount</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map((inv) => `
              <tr>
                <td>${inv.invoiceNumber}</td>
                <td>${formatDate(inv.createdAt)}</td>
                <td>${inv.customerName}</td>
                <td class="text-right">&pound;${inv.total.toFixed(2)}</td>
                <td><span class="status status-${inv.status}">${inv.status}</span></td>
                <td>${new Date(inv.dueDate).toLocaleDateString('en-GB')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Odd Jobs - Manchester & Surrounding Areas</p>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const printSingleInvoice = (invoice: Invoice) => {
    const invoiceDate = invoice.createdAt?.seconds
      ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Unknown';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #e53935; }
          .logo-sub { font-size: 12px; color: #666; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; color: #333; }
          .invoice-number { color: #666; margin-top: 4px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .bill-to h3, .invoice-info h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
          .bill-to p, .invoice-info p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; padding: 12px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 250px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 8px; padding-top: 16px; }
          .notes { margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
          .notes h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
          .footer { margin-top: 60px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { padding: 20px; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Odd Jobs</div>
            <div class="logo-sub">Professional Handyman Services</div>
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
          </div>
        </div>

        <div class="details">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p><strong>${invoice.customerName}</strong></p>
            <p>${invoice.customerEmail}</p>
            <p>${invoice.customerPhone}</p>
          </div>
          <div class="invoice-info">
            <h3>Invoice Details</h3>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems.map((item) => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">&pound;${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">&pound;${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>&pound;${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div class="totals-row total">
            <span>Total</span>
            <span>&pound;${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Odd Jobs - Manchester & Surrounding Areas</p>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  return (
    <div className="invoices-manager">
      <div className="manager-header">
        <div className="header-top">
          <h1>Invoices</h1>
          <div className="export-buttons">
            <button className="btn btn-export" onClick={exportToCSV} disabled={filteredInvoices.length === 0}>
              Export CSV
            </button>
            <button className="btn btn-export" onClick={exportToPDF} disabled={filteredInvoices.length === 0}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="filters">
          <div className="filter-group search-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Year</label>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">All Time</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <span className="label">Total</span>
            <span className="value">&pound;{totalAmount.toFixed(2)}</span>
            <span className="count">{filteredInvoices.length} invoices</span>
          </div>
          <div className="summary-card paid">
            <span className="label">Paid</span>
            <span className="value">&pound;{paidAmount.toFixed(2)}</span>
            <span className="count">{filteredInvoices.filter(i => i.status === 'paid').length} invoices</span>
          </div>
          <div className="summary-card pending">
            <span className="label">Outstanding</span>
            <span className="value">&pound;{pendingAmount.toFixed(2)}</span>
            <span className="count">{filteredInvoices.filter(i => i.status !== 'paid').length} invoices</span>
          </div>
        </div>
      </div>

      <div className="invoices-layout">
        <div className="invoices-list">
          {filteredInvoices.length === 0 ? (
            <div className="empty-state">No invoices found</div>
          ) : (
            filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`invoice-card ${selectedInvoice?.id === invoice.id ? 'selected' : ''}`}
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="invoice-header">
                  <span className="invoice-number">{invoice.invoiceNumber}</span>
                  <span className={`status status-${invoice.status}`}>{invoice.status}</span>
                </div>
                <div className="invoice-customer">{invoice.customerName}</div>
                <div className="invoice-amount">&pound;{invoice.total.toFixed(2)}</div>
                <div className="invoice-date">{formatDate(invoice.createdAt)}</div>
              </div>
            ))
          )}
        </div>

        {selectedInvoice && (
          <div className="invoice-detail">
            <div className="detail-header">
              <h2>{selectedInvoice.invoiceNumber}</h2>
              <div className="header-actions">
                <button className="btn btn-print" onClick={() => printSingleInvoice(selectedInvoice)}>
                  Print Invoice
                </button>
                {selectedInvoice.status !== 'paid' && (
                  <button
                    className="btn btn-delete"
                    onClick={() => handleDeleteInvoice(selectedInvoice)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <label>Customer</label>
                <span>{selectedInvoice.customerName}</span>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <a href={`mailto:${selectedInvoice.customerEmail}`}>{selectedInvoice.customerEmail}</a>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <a href={`tel:${selectedInvoice.customerPhone}`}>{selectedInvoice.customerPhone}</a>
              </div>
              <div className="detail-item">
                <label>Created</label>
                <span>{formatDate(selectedInvoice.createdAt)}</span>
              </div>
              <div className="detail-item">
                <label>Due Date</label>
                <span>{new Date(selectedInvoice.dueDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <select
                  value={selectedInvoice.status}
                  onChange={(e) => handleStatusChange(selectedInvoice.id, e.target.value as Invoice['status'])}
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Payment Summary */}
            {selectedInvoice.status !== 'draft' && (
              <div className="payment-summary">
                <div className="payment-amounts">
                  <div className="amount-item">
                    <span className="amount-label">Invoice Total</span>
                    <span className="amount-value">&pound;{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  <div className="amount-item paid">
                    <span className="amount-label">Amount Paid</span>
                    <span className="amount-value">&pound;{(selectedInvoice.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className={`amount-item due ${getAmountDue(selectedInvoice) > 0 ? 'outstanding' : 'settled'}`}>
                    <span className="amount-label">Amount Due</span>
                    <span className="amount-value">&pound;{getAmountDue(selectedInvoice).toFixed(2)}</span>
                  </div>
                </div>
                {getAmountDue(selectedInvoice) > 0 && (
                  <button
                    className="btn btn-payment"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Record Payment
                  </button>
                )}
              </div>
            )}

            {/* Payment History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div className="payment-history">
                <h3>Payment History</h3>
                {selectedInvoice.payments.map((payment) => (
                  <div key={payment.id} className="payment-item">
                    <div className="payment-main">
                      <span className="payment-amount">&pound;{payment.amount.toFixed(2)}</span>
                      <span className="payment-method">{payment.method}</span>
                    </div>
                    <div className="payment-details">
                      <span className="payment-date">{new Date(payment.date).toLocaleDateString('en-GB')}</span>
                      {payment.reference && <span className="payment-ref">Ref: {payment.reference}</span>}
                    </div>
                    {payment.note && <div className="payment-note">{payment.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {selectedInvoice.status === 'draft' && (
              <div className="draft-actions">
                <button
                  className="btn btn-edit"
                  onClick={() => setEditingInvoice(selectedInvoice)}
                >
                  Edit Invoice
                </button>
                <button
                  className="btn btn-send"
                  onClick={() => handleSendInvoice(selectedInvoice.id)}
                >
                  Send Invoice to Customer
                </button>
              </div>
            )}

            {(selectedInvoice.status === 'paid' || selectedInvoice.status === 'overdue') && (
              <div className="revision-actions">
                <p className="revision-note">This invoice is finalised. To make changes, create a revision.</p>
                <button
                  className="btn btn-revision"
                  onClick={() => setShowRevisionModal(true)}
                >
                  Create Revision
                </button>
              </div>
            )}

            {selectedInvoice.revisionNumber && (
              <div className="revision-info">
                <h4>Revision Details</h4>
                <p><strong>Revision:</strong> #{selectedInvoice.revisionNumber}</p>
                <p><strong>Reason:</strong> {selectedInvoice.revisionReason}</p>
                {selectedInvoice.revisionDate && (
                  <p><strong>Date:</strong> {formatDate(selectedInvoice.revisionDate)}</p>
                )}
              </div>
            )}

            <div className="line-items">
              <h3>Line Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">&pound;{item.unitPrice.toFixed(2)}</td>
                      <td className="text-right">&pound;{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right"><strong>Total</strong></td>
                    <td className="text-right"><strong>&pound;{selectedInvoice.total.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedInvoice.notes && (
              <div className="notes-section">
                <h3>Notes</h3>
                <p>{selectedInvoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .invoices-manager {
          padding: 2rem;
        }

        .manager-header {
          margin-bottom: 2rem;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header-top h1 {
          margin: 0;
          color: var(--text-primary);
        }

        .export-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-export {
          background: #1976d2;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-export:hover:not(:disabled) {
          background: #1565c0;
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .filter-group select,
        .filter-group input {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          min-width: 150px;
        }

        .search-group {
          flex: 1;
          max-width: 300px;
        }

        .search-input {
          width: 100%;
        }

        .search-input:focus {
          outline: none;
          border-color: #9c27b0;
        }

        .summary-cards {
          display: flex;
          gap: 1rem;
        }

        .summary-card {
          flex: 1;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1rem;
          text-align: center;
        }

        .summary-card .label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .summary-card .value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .summary-card .count {
          display: block;
          font-size: 0.8rem;
          color: var(--text-light);
          margin-top: 0.25rem;
        }

        .summary-card.paid .value {
          color: #2e7d32;
        }

        .summary-card.pending .value {
          color: #e65100;
        }

        .invoices-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 2rem;
        }

        .invoices-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 65vh;
          overflow-y: auto;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }

        .invoice-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1rem;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .invoice-card:hover {
          border-color: #9c27b0;
        }

        .invoice-card.selected {
          border-color: #9c27b0;
          box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
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

        .status {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
        }

        .status-pending {
          background: #fff3e0;
          color: #e65100;
        }

        .status-paid {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-overdue {
          background: #ffebee;
          color: #c62828;
        }

        .status-draft {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .draft-actions {
          background: #f3e5f5;
          border: 1px dashed #9c27b0;
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
          text-align: center;
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }

        .btn-edit {
          background: white;
          color: #9c27b0;
          border: 1px solid #9c27b0;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .btn-edit:hover {
          background: #f3e5f5;
        }

        .btn-send {
          background: #9c27b0;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .btn-send:hover {
          background: #7b1fa2;
        }

        .revision-actions {
          background: #fff3e0;
          border: 1px dashed #ff9800;
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .revision-note {
          margin: 0 0 0.75rem;
          font-size: 0.9rem;
          color: #e65100;
        }

        .btn-revision {
          background: #ff9800;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .btn-revision:hover {
          background: #f57c00;
        }

        .revision-info {
          background: #e3f2fd;
          border: 1px solid #1976d2;
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .revision-info h4 {
          margin: 0 0 0.5rem;
          color: #1565c0;
          font-size: 0.9rem;
        }

        .revision-info p {
          margin: 0.25rem 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .revision-modal {
          background: white;
          border-radius: var(--radius-lg, 12px);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .revision-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .revision-modal .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
        }

        .revision-modal .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-light);
          line-height: 1;
        }

        .revision-modal .modal-body {
          padding: 1.5rem;
        }

        .revision-modal .revision-info-text {
          margin: 0 0 1rem;
          color: var(--text-secondary);
        }

        .revision-modal .form-group {
          margin-bottom: 1rem;
        }

        .revision-modal .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }

        .revision-modal .form-group textarea {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
        }

        .revision-modal .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
        }

        .revision-modal .revision-note-text {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-light);
          font-style: italic;
        }

        .revision-modal .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-light);
        }

        .revision-modal .btn {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .revision-modal .btn-secondary {
          background: white;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
        }

        .revision-modal .btn-primary {
          background: var(--accent);
          border: none;
          color: white;
        }

        .revision-modal .btn-primary:hover {
          background: var(--accent-dark);
        }

        .revision-modal .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .invoice-customer {
          font-size: 0.95rem;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .invoice-amount {
          font-weight: 600;
          color: var(--text-primary);
        }

        .invoice-date {
          font-size: 0.8rem;
          color: var(--text-light);
          margin-top: 0.5rem;
        }

        .invoice-detail {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .detail-header h2 {
          margin: 0;
          color: #7b1fa2;
        }

        .btn-print {
          background: #9c27b0;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .btn-print:hover {
          background: #7b1fa2;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-delete {
          background: white;
          color: #c62828;
          border: 1px solid #c62828;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .btn-delete:hover {
          background: #ffebee;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-light);
          margin-bottom: 0.25rem;
        }

        .detail-item a {
          color: var(--accent);
        }

        .detail-item select {
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
        }

        .line-items {
          margin-bottom: 1.5rem;
        }

        .line-items h3 {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .line-items table {
          width: 100%;
          border-collapse: collapse;
        }

        .line-items th {
          text-align: left;
          padding: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-light);
        }

        .line-items td {
          padding: 0.5rem;
          font-size: 0.9rem;
          border-bottom: 1px solid var(--border-light);
        }

        .line-items tfoot td {
          border-top: 2px solid var(--border-light);
          padding-top: 0.75rem;
        }

        .text-right {
          text-align: right;
        }

        .notes-section h3 {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .notes-section p {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: var(--radius-sm);
          white-space: pre-wrap;
          margin: 0;
        }

        /* Payment Summary */
        .payment-summary {
          background: #e3f2fd;
          border: 1px solid #1976d2;
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .payment-amounts {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .amount-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .amount-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .amount-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .amount-item.paid .amount-value {
          color: #2e7d32;
        }

        .amount-item.outstanding .amount-value {
          color: #e65100;
        }

        .amount-item.settled .amount-value {
          color: #2e7d32;
        }

        .btn-payment {
          background: #1976d2;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: 500;
        }

        .btn-payment:hover {
          background: #1565c0;
        }

        /* Payment History */
        .payment-history {
          margin-bottom: 1.5rem;
        }

        .payment-history h3 {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .payment-item {
          background: #e8f5e9;
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .payment-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .payment-amount {
          font-weight: 700;
          color: #2e7d32;
        }

        .payment-method {
          background: #c8e6c9;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .payment-details {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .payment-note {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
          font-style: italic;
        }

        /* Payment Modal */
        .payment-modal {
          background: white;
          border-radius: var(--radius-lg, 12px);
          width: 90%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .payment-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .payment-modal .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
        }

        .payment-modal .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-light);
          line-height: 1;
        }

        .payment-modal .modal-body {
          padding: 1.5rem;
        }

        .payment-info-text {
          margin: 0 0 0.5rem;
          color: var(--text-secondary);
        }

        .payment-due-text {
          margin: 0 0 1.5rem;
          font-size: 1.1rem;
        }

        .payment-modal .form-group {
          margin-bottom: 1rem;
        }

        .payment-modal .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }

        .payment-modal .form-group input,
        .payment-modal .form-group select {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
        }

        .payment-modal .form-group input:focus,
        .payment-modal .form-group select:focus {
          outline: none;
          border-color: #1976d2;
        }

        .payment-modal .input-with-prefix {
          position: relative;
        }

        .payment-modal .input-with-prefix .prefix {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }

        .payment-modal .input-with-prefix input {
          padding-left: 1.75rem;
        }

        .payment-modal .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .payment-modal .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-light);
        }

        .payment-modal .btn {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .payment-modal .btn-secondary {
          background: white;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
        }

        .payment-modal .btn-primary {
          background: #1976d2;
          border: none;
          color: white;
        }

        .payment-modal .btn-primary:hover {
          background: #1565c0;
        }

        .payment-modal .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .invoices-layout {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .summary-cards {
            flex-direction: column;
          }

          .filters {
            flex-direction: column;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {editingInvoice && (
        <InvoiceBuilder
          submissionId={editingInvoice.submissionId}
          customerName={editingInvoice.customerName}
          customerEmail={editingInvoice.customerEmail}
          customerPhone={editingInvoice.customerPhone}
          service=""
          onClose={() => setEditingInvoice(null)}
          onCreated={() => setEditingInvoice(null)}
          existingInvoice={{
            id: editingInvoice.id,
            invoiceNumber: editingInvoice.invoiceNumber,
            lineItems: editingInvoice.lineItems,
            notes: editingInvoice.notes,
            dueDate: editingInvoice.dueDate,
          }}
        />
      )}

      {showRevisionModal && selectedInvoice && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRevisionModal(false)}>
          <div className="revision-modal">
            <div className="modal-header">
              <h3>Create Invoice Revision</h3>
              <button className="close-btn" onClick={() => setShowRevisionModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="revision-info-text">
                Creating a revision of invoice <strong>{selectedInvoice.invoiceNumber}</strong>
              </p>
              <div className="form-group">
                <label>Reason for Revision *</label>
                <textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Additional work requested, Price adjustment, Scope change..."
                  rows={4}
                  required
                />
              </div>
              <p className="revision-note-text">
                A new draft invoice will be created with all the details from the original.
                You can edit the new invoice before sending it to the customer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRevisionModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateRevision}
                disabled={!revisionReason.trim()}
              >
                Create Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="payment-info-text">
                Recording payment for invoice <strong>{selectedInvoice.invoiceNumber}</strong>
              </p>
              <p className="payment-due-text">
                Amount due: <strong>&pound;{getAmountDue(selectedInvoice).toFixed(2)}</strong>
              </p>
              <div className="form-group">
                <label>Amount *</label>
                <div className="input-with-prefix">
                  <span className="prefix">&pound;</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank' | 'card' | 'cheque')}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Reference (optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. Bank reference, cheque number"
                />
              </div>
              <div className="form-group">
                <label>Note (optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Any additional notes"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
