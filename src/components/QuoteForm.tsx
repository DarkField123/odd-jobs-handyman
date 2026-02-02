import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface QuoteFormProps {
  services: { id: string; name: string }[];
  preselectedService?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
}

// Sanitize input to prevent XSS
function sanitize(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export default function QuoteForm({ services, preselectedService }: QuoteFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    service: preselectedService || '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Update service if preselected changes (from URL param)
  useEffect(() => {
    if (preselectedService) {
      setFormData((prev) => ({ ...prev, service: preselectedService }));
    }
  }, [preselectedService]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)\+\.]+$/.test(formData.phone) || formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.service) {
      newErrors.service = 'Please select a service';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please describe your requirements';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Please provide more details (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Create submission document
      const submission = {
        name: sanitize(formData.name),
        email: sanitize(formData.email),
        phone: sanitize(formData.phone),
        service: sanitize(formData.service),
        message: sanitize(formData.message),
        status: 'new',
        createdAt: serverTimestamp(),
      };

      // Save to Firestore
      await addDoc(collection(db, 'submissions'), submission);

      setSubmitStatus('success');
      setSubmitMessage('Thank you! Your quote request has been submitted. We\'ll be in touch shortly.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting quote:', error);
      setSubmitStatus('error');
      setSubmitMessage('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="quote-form-container">
      <h2>Request a Free Quote</h2>
      <p className="form-intro">
        Fill out the form below and we'll get back to you within 24 hours with a free estimate.
      </p>

      {submitStatus === 'success' && (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>{submitMessage}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>{submitMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="quote-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Smith"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">
              Phone Number <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="07123 456789"
              className={errors.phone ? 'error' : ''}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="service">
              Service Required <span className="required">*</span>
            </label>
            <select
              id="service"
              value={formData.service}
              onChange={(e) => handleChange('service', e.target.value)}
              className={errors.service ? 'error' : ''}
            >
              <option value="">Select a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
            {errors.service && <span className="error-message">{errors.service}</span>}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="message">
            Job Description <span className="required">*</span>
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Please describe the work you need done, including any relevant details about your property or timeline..."
            rows={5}
            className={errors.message ? 'error' : ''}
          />
          {errors.message && <span className="error-message">{errors.message}</span>}
          <span className="char-count">{formData.message.length}/2000</span>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-submit">
          {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
        </button>
      </form>

      <style>{`
        .quote-form-container {
          max-width: 700px;
          margin: 0 auto;
        }

        .quote-form-container h2 {
          font-size: 2rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .form-intro {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: var(--radius-md);
          margin-bottom: 2rem;
        }

        .alert svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .alert p {
          margin: 0;
        }

        .alert-success {
          background: #e8f5e9;
          border: 1px solid #4caf50;
          color: #2e7d32;
        }

        .alert-error {
          background: #ffebee;
          border: 1px solid #f44336;
          color: #c62828;
        }

        .quote-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          position: relative;
        }

        .form-group label {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .required {
          color: var(--accent);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-lighter);
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
          border-color: #f44336;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 120px;
        }

        .error-message {
          color: #f44336;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .char-count {
          position: absolute;
          right: 0;
          bottom: -1.5rem;
          font-size: 0.8rem;
          color: var(--text-light);
        }

        .btn-submit {
          margin-top: 1rem;
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .quote-form-container h2 {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
