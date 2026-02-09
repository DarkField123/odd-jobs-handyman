import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase/client';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface ExistingInvoice {
  id: string;
  invoiceNumber: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes: string;
  dueDate: string;
  includeVat?: boolean;
  vatRate?: number;
}

interface InvoiceBuilderProps {
  submissionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  quoteRef?: string; // Quote reference to base invoice number on
  onClose: () => void;
  onCreated: () => void;
  existingInvoice?: ExistingInvoice; // For editing existing invoices
}

export function InvoiceBuilder({
  submissionId,
  customerName,
  customerEmail,
  customerPhone,
  service,
  quoteRef,
  onClose,
  onCreated,
  existingInvoice,
}: InvoiceBuilderProps) {
  const isEditing = !!existingInvoice;
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string | null>(null);

  // Fetch next invoice number for this submission
  useEffect(() => {
    if (isEditing || !db || !submissionId) return;

    const fetchNextNumber = async () => {
      try {
        const invoicesRef = collection(db!, 'invoices');
        const q = query(
          invoicesRef,
          where('submissionId', '==', submissionId)
        );
        const snapshot = await getDocs(q);
        const count = snapshot.size;

        // Use quoteRef if available, otherwise generate a fallback
        const base = quoteRef || `HMS-${submissionId.slice(0, 8)}`;
        setNextInvoiceNumber(`${base}-${count + 1}`);
      } catch (error) {
        console.error('Error fetching invoice count:', error);
        // Fallback to quoteRef-1 or generate a basic number
        const base = quoteRef || `HMS-${Date.now()}`;
        setNextInvoiceNumber(`${base}-1`);
      }
    };

    fetchNextNumber();
  }, [submissionId, quoteRef, isEditing]);

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (existingInvoice?.lineItems) {
      return existingInvoice.lineItems.map((item) => ({
        id: crypto.randomUUID(),
        ...item,
      }));
    }
    return [{ id: crypto.randomUUID(), description: service, quantity: 1, unitPrice: 0 }];
  });
  const [notes, setNotes] = useState(existingInvoice?.notes || '');
  const [dueDate, setDueDate] = useState(() => {
    if (existingInvoice?.dueDate) return existingInvoice.dueDate;
    const date = new Date();
    date.setDate(date.getDate() + 14); // Default 14 days
    return date.toISOString().split('T')[0];
  });
  const [includeVat, setIncludeVat] = useState(existingInvoice?.includeVat || false);
  const [vatRate, setVatRate] = useState(existingInvoice?.vatRate || 20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // VAT calculations
  const vatAmount = includeVat ? subtotal * (vatRate / 100) : 0;
  const grossTotal = subtotal + vatAmount;

  // Generate fallback invoice number if nextInvoiceNumber is not ready
  const generateFallbackInvoiceNumber = () => {
    const base = quoteRef || `HMS-${Date.now()}`;
    return `${base}-1`;
  };

  const handleSave = async (isDraft: boolean) => {
    if (lineItems.some((item) => !item.description.trim())) {
      setError('All line items must have a description');
      return;
    }

    if (grossTotal <= 0 && !isDraft) {
      setError('Invoice total must be greater than zero');
      return;
    }

    if (!db) {
      setError('Database not available');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('Not authenticated');

      if (isEditing && existingInvoice) {
        // Update existing invoice
        await updateDoc(doc(db, 'invoices', existingInvoice.id), {
          lineItems: lineItems.map(({ id, ...rest }) => rest),
          subtotal,
          includeVat,
          vatRate: includeVat ? vatRate : null,
          vatAmount: includeVat ? vatAmount : 0,
          total: grossTotal,
          notes: notes.trim(),
          dueDate,
          status: isDraft ? 'draft' : 'pending',
          sendEmail: !isDraft, // Only send email if not a draft
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new invoice
        const invoiceNumber = nextInvoiceNumber || generateFallbackInvoiceNumber();
        await addDoc(collection(db, 'invoices'), {
          invoiceNumber,
          submissionId,
          customerName,
          customerEmail,
          customerPhone,
          lineItems: lineItems.map(({ id, ...rest }) => rest),
          subtotal,
          includeVat,
          vatRate: includeVat ? vatRate : null,
          vatAmount: includeVat ? vatAmount : 0,
          total: grossTotal,
          notes: notes.trim(),
          dueDate,
          status: isDraft ? 'draft' : 'pending',
          sendEmail: !isDraft, // Only send email if not a draft
          createdBy: user.uid,
          createdByEmail: user.email,
          createdAt: serverTimestamp(),
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} invoice:`, err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to ${isEditing ? 'update' : 'create'} invoice: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const invoiceNumber = existingInvoice?.invoiceNumber || nextInvoiceNumber || generateFallbackInvoiceNumber();
    const invoiceDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
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
          @media print {
            body { padding: 20px; }
            @page { margin: 1cm; }
          }
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
            <div class="invoice-number">${invoiceNumber}</div>
          </div>
        </div>

        <div class="details">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p><strong>${customerName}</strong></p>
            <p>${customerEmail}</p>
            <p>${customerPhone}</p>
          </div>
          <div class="invoice-info">
            <h3>Invoice Details</h3>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
            ${lineItems
              .map(
                (item) => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">&pound;${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">&pound;${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>&pound;${subtotal.toFixed(2)}</span>
          </div>
          ${includeVat ? `
          <div class="totals-row">
            <span>VAT (${vatRate}%)</span>
            <span>&pound;${vatAmount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total</span>
            <span>&pound;${grossTotal.toFixed(2)}</span>
          </div>
        </div>

        ${notes.trim() ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${notes.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Odd Jobs - Manchester & Surrounding Areas</p>
        </div>
      </body>
      </html>
    `;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      setError('Failed to create print preview');
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for content to load then print
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
        setError('Failed to print. Please try again.');
      }
      // Clean up after a delay to allow print dialog to appear
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    // Fallback: trigger load manually if already loaded
    setTimeout(() => {
      if (iframe.parentNode) {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          // Already handled or will be handled by onload
        }
      }
    }, 500);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content invoice-modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Edit' : 'Create'} Invoice for {customerName}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="invoice-meta">
            <div className="meta-row">
              <div className="form-group">
                <label htmlFor="due-date">Due Date</label>
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="form-group vat-toggle">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                  />
                  <span>Include VAT</span>
                </label>
              </div>
              {includeVat && (
                <div className="form-group">
                  <label htmlFor="vat-rate">VAT Rate</label>
                  <select
                    id="vat-rate"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                  >
                    <option value={20}>20% (Standard)</option>
                    <option value={5}>5% (Reduced)</option>
                    <option value={0}>0% (Zero-rated)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="line-items-section">
            <div className="section-header">
              <h4>Line Items</h4>
              <button type="button" className="btn btn-add" onClick={addLineItem}>
                + Add Item
              </button>
            </div>

            <div className="line-items-table">
              <div className="line-items-header">
                <span className="col-desc">Description</span>
                <span className="col-qty">Qty</span>
                <span className="col-price">Unit Price</span>
                <span className="col-total">Total</span>
                <span className="col-actions"></span>
              </div>

              {lineItems.map((item) => (
                <div key={item.id} className="line-item-row">
                  <input
                    type="text"
                    className="col-desc"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(item.id, 'description', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="col-qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                    }
                  />
                  <div className="col-price input-with-prefix">
                    <span className="prefix">&pound;</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <span className="col-total">
                    &pound;{(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="col-actions btn-remove"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    aria-label="Remove item"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="invoice-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>&pound;{subtotal.toFixed(2)}</span>
              </div>
              {includeVat && (
                <div className="total-row vat-row">
                  <span>VAT ({vatRate}%)</span>
                  <span>&pound;{vatAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="total-row grand-total">
                <span>Total</span>
                <span>&pound;{grossTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="invoice-notes">Notes (optional)</label>
            <textarea
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment terms, bank details, or other notes..."
            />
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={saving}
          >
            Download PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-draft"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Draft' : 'Save as Draft')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave(false)}
            disabled={saving || grossTotal <= 0}
          >
            {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update & Send' : 'Create & Send')}
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

        .invoice-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
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
          position: sticky;
          top: 0;
          background: white;
          z-index: 1;
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

        .invoice-meta {
          margin-bottom: 1.5rem;
        }

        .meta-row {
          display: flex;
          gap: 1.5rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .vat-toggle {
          display: flex;
          align-items: center;
        }

        .vat-toggle .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          padding: 0.5rem 0;
        }

        .vat-toggle .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .form-group select {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
          background: white;
          cursor: pointer;
        }

        .form-group select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .vat-row {
          color: #666;
          font-size: 0.9rem;
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

        .form-group input[type="date"] {
          max-width: 200px;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
        }

        .form-group textarea {
          resize: vertical;
        }

        .line-items-section {
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .btn-add {
          background: #f0f0f0;
          border: 1px dashed #ccc;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #666;
          transition: all 0.2s;
        }

        .btn-add:hover {
          background: #e8e8e8;
          border-color: #999;
          color: #333;
        }

        .line-items-table {
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
        }

        .line-items-header {
          display: grid;
          grid-template-columns: 1fr 80px 120px 100px 40px;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f5f5f5;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
        }

        .line-item-row {
          display: grid;
          grid-template-columns: 1fr 80px 120px 100px 40px;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid #eee;
          align-items: center;
        }

        .line-item-row input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .line-item-row input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .col-qty input,
        .col-price input {
          text-align: right;
        }

        .col-total {
          text-align: right;
          font-weight: 600;
          color: var(--text-primary);
        }

        .input-with-prefix {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-prefix .prefix {
          position: absolute;
          left: 8px;
          color: #666;
          font-size: 0.9rem;
        }

        .input-with-prefix input {
          padding-left: 20px;
          width: 100%;
        }

        .btn-remove {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-remove:hover:not(:disabled) {
          background: #ffebee;
          color: #c62828;
        }

        .btn-remove:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .invoice-totals {
          padding: 1rem;
          background: #fafafa;
          border-top: 1px solid #eee;
        }

        .total-row {
          display: flex;
          justify-content: flex-end;
          gap: 2rem;
          padding: 0.25rem 0;
          font-size: 0.95rem;
        }

        .total-row.grand-total {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
          border-top: 2px solid #ddd;
        }

        .email-option {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-size: 0.95rem;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.9rem;
          margin-top: 1rem;
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
          position: sticky;
          bottom: 0;
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

        .btn-draft {
          background: #ff9800;
          border: none;
          color: white;
        }

        .btn-draft:hover:not(:disabled) {
          background: #f57c00;
        }

        @media (max-width: 640px) {
          .line-items-header,
          .line-item-row {
            grid-template-columns: 1fr 60px 90px 80px 32px;
            font-size: 0.8rem;
            gap: 0.25rem;
            padding: 0.5rem;
          }

          .line-item-row input {
            padding: 0.4rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
