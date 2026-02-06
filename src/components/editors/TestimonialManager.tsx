import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Testimonial {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  service?: string;
  date: string;
  featured?: boolean;
}

interface FormState {
  name: string;
  location: string;
  text: string;
  rating: number;
  service: string;
  date: string;
  featured: boolean;
}

const emptyForm: FormState = {
  name: '',
  location: '',
  text: '',
  rating: 5,
  service: '',
  date: '',
  featured: true,
};

const serviceOptions = [
  { id: '', name: 'No specific service' },
  { id: 'plumbing', name: 'Plumbing' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'carpentry', name: 'Carpentry' },
  { id: 'painting', name: 'Painting & Decorating' },
  { id: 'general', name: 'General Repairs' },
  { id: 'assembly', name: 'Assembly' },
];

export function TestimonialManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isAdding, setIsAdding] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState<FormState>(emptyForm);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'testimonials'), (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Testimonial[];
      // Sort by featured first, then by date
      items.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
      setTestimonials(items);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (testimonial: Testimonial) => {
    setIsEditing(testimonial.id);
    setEditForm({
      name: testimonial.name,
      location: testimonial.location,
      text: testimonial.text,
      rating: testimonial.rating,
      service: testimonial.service || '',
      date: testimonial.date,
      featured: testimonial.featured ?? true,
    });
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      const updateData: Record<string, unknown> = {
        name: editForm.name,
        location: editForm.location,
        text: editForm.text,
        rating: editForm.rating,
        date: editForm.date,
        featured: editForm.featured,
        updatedAt: serverTimestamp(),
      };

      if (editForm.service) {
        updateData.service = editForm.service;
      } else {
        updateData.service = null;
      }

      await updateDoc(doc(db, 'testimonials', isEditing), updateData);
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating testimonial:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
    } catch (error) {
      console.error('Error deleting testimonial:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const newData: Record<string, unknown> = {
        name: newTestimonial.name,
        location: newTestimonial.location,
        text: newTestimonial.text,
        rating: newTestimonial.rating,
        date: newTestimonial.date,
        featured: newTestimonial.featured,
        createdAt: serverTimestamp(),
      };

      if (newTestimonial.service) {
        newData.service = newTestimonial.service;
      }

      await addDoc(collection(db, 'testimonials'), newData);
      setIsAdding(false);
      setNewTestimonial(emptyForm);
    } catch (error) {
      console.error('Error adding testimonial:', error);
    }
  };

  const toggleFeatured = async (testimonial: Testimonial) => {
    try {
      await updateDoc(doc(db, 'testimonials', testimonial.id), {
        featured: !testimonial.featured,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const renderStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  const renderForm = (
    form: FormState,
    setForm: (f: FormState) => void,
    onSave: () => void,
    onCancel: () => void,
    title?: string
  ) => (
    <div className="add-form">
      {title && <h3>{title}</h3>}
      <div className="form-row">
        <div className="form-group">
          <label>Customer Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Sarah M."
          />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g., Didsbury"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Testimonial Text</label>
        <textarea
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder="What did the customer say about your service?"
          rows={4}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Rating</label>
          <select
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })}
          >
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>
        <div className="form-group">
          <label>Service (optional)</label>
          <select
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          >
            {serviceOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Date</label>
          <input
            type="text"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            placeholder="e.g., January 2024"
          />
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Featured on homepage
          </label>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSave}>
          {title ? 'Add Testimonial' : 'Save Changes'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="testimonial-manager">
      <div className="manager-header">
        <h1>Testimonials</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          Add Testimonial
        </button>
      </div>

      {isAdding &&
        renderForm(
          newTestimonial,
          setNewTestimonial,
          handleAdd,
          () => {
            setIsAdding(false);
            setNewTestimonial(emptyForm);
          },
          'Add New Testimonial'
        )}

      {testimonials.length === 0 && !isAdding && (
        <div className="empty-state">
          <p>No testimonials yet. Add your first customer review!</p>
        </div>
      )}

      <div className="testimonials-list">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="testimonial-card">
            {isEditing === testimonial.id ? (
              renderForm(editForm, setEditForm, handleSave, () => setIsEditing(null))
            ) : (
              <>
                <div className="testimonial-content">
                  <div className="testimonial-header">
                    <div>
                      <h3>{testimonial.name}</h3>
                      <span className="location">{testimonial.location}</span>
                    </div>
                    <div className="badges">
                      {testimonial.featured && <span className="badge featured">Featured</span>}
                      {testimonial.service && (
                        <span className="badge service">
                          {serviceOptions.find((s) => s.id === testimonial.service)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text">"{testimonial.text}"</p>
                  <div className="meta">
                    <span className="rating">{renderStars(testimonial.rating)}</span>
                    <span className="date">{testimonial.date}</span>
                  </div>
                </div>
                <div className="testimonial-actions">
                  <button
                    className={`btn btn-sm ${testimonial.featured ? 'btn-warning' : 'btn-outline'}`}
                    onClick={() => toggleFeatured(testimonial)}
                    title={testimonial.featured ? 'Remove from homepage' : 'Show on homepage'}
                  >
                    {testimonial.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(testimonial)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(testimonial.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .testimonial-manager {
          padding: 2rem;
        }
        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .manager-header h1 {
          margin: 0;
          color: var(--text-primary);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          background: #f9f9f9;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
        }
        .add-form {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: var(--radius-md);
          margin-bottom: 2rem;
        }
        .add-form h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
        }
        .checkbox-group {
          display: flex;
          align-items: center;
        }
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .checkbox-group input[type="checkbox"] {
          width: auto;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .testimonials-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .testimonial-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }
        .testimonial-content {
          margin-bottom: 1rem;
        }
        .testimonial-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .testimonial-header h3 {
          margin: 0;
          color: var(--text-primary);
        }
        .location {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .badges {
          display: flex;
          gap: 0.5rem;
        }
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge.featured {
          background: #fff3e0;
          color: #e65100;
        }
        .badge.service {
          background: var(--accent-lighter, #ffebee);
          color: var(--accent);
        }
        .text {
          color: var(--text-primary);
          line-height: 1.6;
          margin: 0 0 1rem;
          font-style: italic;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rating {
          color: #f5a623;
          font-size: 1.1rem;
          letter-spacing: 2px;
        }
        .date {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .testimonial-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
        }
        .btn-sm {
          padding: 0.4rem 0.75rem;
          font-size: 0.875rem;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
        }
        .btn-outline:hover {
          background: var(--bg-light);
        }
        .btn-warning {
          background: #ff9800;
          color: white;
          border: none;
        }
        .btn-warning:hover {
          background: #f57c00;
        }
        .btn-danger {
          background: #f44336;
          color: white;
          border: none;
          cursor: pointer;
        }
        .btn-danger:hover {
          background: #d32f2f;
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .testimonial-header {
            flex-direction: column;
            gap: 0.5rem;
          }
          .testimonial-actions {
            flex-wrap: wrap;
          }
          .testimonial-actions button {
            flex: 1;
            min-width: 80px;
          }
        }
      `}</style>
    </div>
  );
}
