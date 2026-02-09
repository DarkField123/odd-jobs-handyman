import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface BusinessSettings {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  vatRegistered: boolean;
  vatNumber: string;
  bankDetails: {
    accountName: string;
    sortCode: string;
    accountNumber: string;
  };
  defaultPaymentTerms: number;
  defaultInvoiceNotes: string;
  updatedAt?: { seconds: number };
}

const defaultSettings: BusinessSettings = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  vatRegistered: false,
  vatNumber: '',
  bankDetails: {
    accountName: '',
    sortCode: '',
    accountNumber: '',
  },
  defaultPaymentTerms: 14,
  defaultInvoiceNotes: '',
};

export default function SettingsManager() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!db) return;
      try {
        const docRef = doc(db, 'settings', 'business');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() } as BusinessSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'business'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(`Error saving settings: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof BusinessSettings>(field: K, value: BusinessSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const updateBankField = (field: keyof BusinessSettings['bankDetails'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading settings...</p>
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
    <div className="settings-manager">
      <style>{`
        .settings-manager {
          max-width: 800px;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .settings-header h2 {
          margin: 0;
          color: var(--text-primary);
        }
        .save-btn {
          padding: 0.6rem 1.5rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s;
        }
        .save-btn:hover {
          opacity: 0.9;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .save-btn.saved {
          background: #2e7d32;
        }
        .settings-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .section-header {
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
        .section-header h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.1rem;
        }
        .section-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-left: auto;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent);
        }
        .toggle-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .toggle {
          position: relative;
          width: 50px;
          height: 26px;
        }
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ccc;
          border-radius: 26px;
          transition: 0.3s;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .toggle input:checked + .toggle-slider {
          background: var(--accent);
        }
        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }
        .toggle-label {
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .input-hint {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.35rem;
        }
        .bank-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .bank-grid {
            grid-template-columns: 1fr;
          }
        }
        .last-saved {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 1rem;
          text-align: right;
        }
      `}</style>

      <div className="settings-header">
        <h2>Business Settings</h2>
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon">🏢</span>
          <h3>Business Details</h3>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Business Name</label>
            <input
              type="text"
              value={settings.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder="Odd Jobs"
            />
          </div>
          <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              value={settings.contactName}
              onChange={(e) => updateField('contactName', e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="hello@oddjobs.com"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="07123 456789"
            />
          </div>
          <div className="form-group full-width">
            <label>Business Address</label>
            <textarea
              value={settings.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main Street&#10;Manchester&#10;M1 1AA"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon">📋</span>
          <h3>VAT Settings</h3>
        </div>
        <div className="form-group">
          <div className="toggle-group">
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.vatRegistered}
                onChange={(e) => updateField('vatRegistered', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">VAT Registered</span>
          </div>
          <p className="input-hint">Enable this if you are registered for VAT with HMRC</p>
        </div>
        {settings.vatRegistered && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>VAT Registration Number</label>
            <input
              type="text"
              value={settings.vatNumber}
              onChange={(e) => updateField('vatNumber', e.target.value)}
              placeholder="GB 123 4567 89"
            />
            <p className="input-hint">This will appear on your invoices</p>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon">🏦</span>
          <h3>Bank Details</h3>
          <span className="section-desc">Shown on invoices for payment</span>
        </div>
        <div className="bank-grid">
          <div className="form-group">
            <label>Account Name</label>
            <input
              type="text"
              value={settings.bankDetails.accountName}
              onChange={(e) => updateBankField('accountName', e.target.value)}
              placeholder="J Smith"
            />
          </div>
          <div className="form-group">
            <label>Sort Code</label>
            <input
              type="text"
              value={settings.bankDetails.sortCode}
              onChange={(e) => updateBankField('sortCode', e.target.value)}
              placeholder="12-34-56"
            />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input
              type="text"
              value={settings.bankDetails.accountNumber}
              onChange={(e) => updateBankField('accountNumber', e.target.value)}
              placeholder="12345678"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <span className="section-icon">🧾</span>
          <h3>Invoice Defaults</h3>
        </div>
        <div className="form-group">
          <label>Default Payment Terms (days)</label>
          <select
            value={settings.defaultPaymentTerms}
            onChange={(e) => updateField('defaultPaymentTerms', parseInt(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
          <p className="input-hint">This sets the default due date when creating invoices</p>
        </div>
        <div className="form-group">
          <label>Default Invoice Notes</label>
          <textarea
            value={settings.defaultInvoiceNotes}
            onChange={(e) => updateField('defaultInvoiceNotes', e.target.value)}
            placeholder="Thank you for your business!&#10;&#10;Payment can be made by bank transfer or cash."
            rows={4}
          />
          <p className="input-hint">These notes will appear on all new invoices by default</p>
        </div>
      </div>

      {settings.updatedAt && (
        <p className="last-saved">
          Last saved: {new Date(settings.updatedAt.seconds * 1000).toLocaleString('en-GB')}
        </p>
      )}
    </div>
  );
}
