import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  jobs: string[];
  note?: string;
  order?: number;
}

interface SkillManagerProps {
  skills: Skill[];
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  jobs: string;
  note: string;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  icon: 'general',
  jobs: '',
  note: '',
};

export function SkillManager({ skills: initialSkills }: SkillManagerProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState<FormState>(emptyForm);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'skills'), (snapshot) => {
      const updatedSkills = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Skill[];
      setSkills(updatedSkills.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (skill: Skill) => {
    setIsEditing(skill.id);
    setEditForm({
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      jobs: (skill.jobs || []).join('\n'),
      note: skill.note || '',
    });
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      const jobsArray = editForm.jobs
        .split('\n')
        .map(j => j.trim())
        .filter(j => j.length > 0);

      const updateData: Record<string, unknown> = {
        name: editForm.name,
        description: editForm.description,
        icon: editForm.icon,
        jobs: jobsArray,
        updatedAt: serverTimestamp(),
      };

      if (editForm.note.trim()) {
        updateData.note = editForm.note.trim();
      } else {
        updateData.note = null;
      }

      await updateDoc(doc(db, 'skills', isEditing), updateData);
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating skill:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteDoc(doc(db, 'skills', id));
    } catch (error) {
      console.error('Error deleting skill:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const jobsArray = newSkill.jobs
        .split('\n')
        .map(j => j.trim())
        .filter(j => j.length > 0);

      const newData: Record<string, unknown> = {
        name: newSkill.name,
        description: newSkill.description,
        icon: newSkill.icon,
        jobs: jobsArray,
        order: skills.length,
        createdAt: serverTimestamp(),
      };

      if (newSkill.note.trim()) {
        newData.note = newSkill.note.trim();
      }

      await addDoc(collection(db, 'skills'), newData);
      setIsAdding(false);
      setNewSkill(emptyForm);
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const iconOptions = ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'assembly'];

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
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Service name"
          />
        </div>
        <div className="form-group">
          <label>Icon</label>
          <select
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          >
            {iconOptions.map(icon => (
              <option key={icon} value={icon}>{icon}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of the service"
          rows={2}
        />
      </div>
      <div className="form-group">
        <label>Jobs (one per line)</label>
        <textarea
          value={form.jobs}
          onChange={(e) => setForm({ ...form, jobs: e.target.value })}
          placeholder="Tap replacement & repairs&#10;Toilet repairs & replacements&#10;Fixing leaking pipes"
          rows={6}
        />
        <span className="form-hint">Enter each job on a new line</span>
      </div>
      <div className="form-group">
        <label>Regulatory Note (optional)</label>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="e.g., We do not carry out gas work..."
          rows={2}
        />
        <span className="form-hint">Add any disclaimers or limitations for this service</span>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSave}>
          {title ? 'Add Service' : 'Save Changes'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="skill-manager">
      <div className="manager-header">
        <h1>Services Management</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          Add New Service
        </button>
      </div>

      {isAdding && renderForm(
        newSkill,
        setNewSkill,
        handleAdd,
        () => { setIsAdding(false); setNewSkill(emptyForm); },
        'Add New Service'
      )}

      <div className="skills-list">
        {skills.map((skill) => (
          <div key={skill.id} className="skill-card">
            {isEditing === skill.id ? (
              renderForm(
                editForm,
                setEditForm,
                handleSave,
                () => setIsEditing(null)
              )
            ) : (
              <>
                <div className="skill-info">
                  <div className="skill-header">
                    <h3>{skill.name}</h3>
                    <span className="skill-icon-badge">{skill.icon}</span>
                  </div>
                  <p className="skill-description">{skill.description}</p>
                  {skill.jobs && skill.jobs.length > 0 && (
                    <div className="skill-jobs">
                      <strong>Jobs ({skill.jobs.length}):</strong>
                      <ul>
                        {skill.jobs.slice(0, 4).map((job, i) => (
                          <li key={i}>{job}</li>
                        ))}
                        {skill.jobs.length > 4 && (
                          <li className="more">+{skill.jobs.length - 4} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {skill.note && (
                    <div className="skill-note">
                      <strong>Note:</strong> {skill.note}
                    </div>
                  )}
                </div>
                <div className="skill-actions">
                  <button className="btn btn-secondary" onClick={() => handleEdit(skill)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(skill.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .skill-manager {
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
          grid-template-columns: 1fr 200px;
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
        .form-hint {
          display: block;
          font-size: 0.8rem;
          color: var(--text-light);
          margin-top: 0.25rem;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .skills-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .skill-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }
        .skill-card > div:not(.add-form) {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .skill-info {
          flex: 1;
        }
        .skill-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .skill-header h3 {
          margin: 0;
          color: var(--text-primary);
        }
        .skill-icon-badge {
          background: var(--accent-lighter, #ffebee);
          color: var(--accent);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .skill-description {
          margin: 0 0 1rem;
          color: var(--text-secondary);
        }
        .skill-jobs {
          margin-bottom: 0.75rem;
        }
        .skill-jobs strong {
          font-size: 0.875rem;
          color: var(--text-primary);
        }
        .skill-jobs ul {
          margin: 0.5rem 0 0;
          padding-left: 1.25rem;
        }
        .skill-jobs li {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }
        .skill-jobs li.more {
          color: var(--text-light);
          font-style: italic;
        }
        .skill-note {
          background: #fff8e1;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          color: #6d5e00;
        }
        .skill-note strong {
          color: inherit;
        }
        .skill-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .btn-danger {
          background: #f44336;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-danger:hover {
          background: #d32f2f;
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .skill-card > div:not(.add-form) {
            flex-direction: column;
          }
          .skill-actions {
            width: 100%;
          }
          .skill-actions button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
