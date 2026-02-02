import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  order?: number;
}

interface SkillManagerProps {
  skills: Skill[];
}

export function SkillManager({ skills: initialSkills }: SkillManagerProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', icon: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', icon: 'general' });

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
    setEditForm({ name: skill.name, description: skill.description, icon: skill.icon });
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      await updateDoc(doc(db, 'skills', isEditing), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
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
      await addDoc(collection(db, 'skills'), {
        ...newSkill,
        order: skills.length,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewSkill({ name: '', description: '', icon: 'general' });
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const iconOptions = ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'assembly'];

  return (
    <div className="skill-manager">
      <div className="manager-header">
        <h1>Services Management</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          Add New Service
        </button>
      </div>

      {isAdding && (
        <div className="add-form">
          <h3>Add New Service</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              placeholder="Service name"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newSkill.description}
              onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>
          <div className="form-group">
            <label>Icon</label>
            <select
              value={newSkill.icon}
              onChange={(e) => setNewSkill({ ...newSkill, icon: e.target.value })}
            >
              {iconOptions.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAdd}>Add Service</button>
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="skills-list">
        {skills.map((skill) => (
          <div key={skill.id} className="skill-card">
            {isEditing === skill.id ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <select
                  value={editForm.icon}
                  onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                >
                  {iconOptions.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleSave}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="skill-info">
                  <h3>{skill.name}</h3>
                  <p>{skill.description}</p>
                  <span className="skill-icon">Icon: {skill.icon}</span>
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
        .add-form, .edit-form {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: var(--radius-md);
          margin-bottom: 2rem;
        }
        .add-form h3 {
          margin-top: 0;
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
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .skill-info h3 {
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }
        .skill-info p {
          margin: 0 0 0.5rem;
          color: var(--text-secondary);
        }
        .skill-icon {
          font-size: 0.875rem;
          color: var(--text-light);
        }
        .skill-actions {
          display: flex;
          gap: 0.5rem;
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
      `}</style>
    </div>
  );
}
