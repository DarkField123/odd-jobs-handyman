import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase/client';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  skillId?: string;
  featured?: boolean;
}

interface Skill {
  id: string;
  name: string;
}

interface ProjectManagerProps {
  projects: Project[];
  skills: Skill[];
}

export function ProjectManager({ projects: initialProjects, skills }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', skillId: '', featured: false });
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', skillId: '', featured: false });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const updatedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(updatedProjects);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (project: Project) => {
    setIsEditing(project.id);
    setEditForm({
      title: project.title,
      description: project.description,
      skillId: project.skillId || '',
      featured: project.featured || false
    });
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      await updateDoc(doc(db, 'projects', isEditing), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleAdd = async () => {
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewProject({ title: '', description: '', skillId: '', featured: false });
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  return (
    <div className="project-manager">
      <div className="manager-header">
        <h1>Projects Management</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          Add New Project
        </button>
      </div>

      {isAdding && (
        <div className="add-form">
          <h3>Add New Project</h3>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              placeholder="Project title"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Project description"
            />
          </div>
          <div className="form-group">
            <label>Service Category</label>
            <select
              value={newProject.skillId}
              onChange={(e) => setNewProject({ ...newProject, skillId: e.target.value })}
            >
              <option value="">Select a service...</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={newProject.featured}
                onChange={(e) => setNewProject({ ...newProject, featured: e.target.checked })}
              />
              Featured project
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAdd}>Add Project</button>
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="projects-list">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            {isEditing === project.id ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <select
                  value={editForm.skillId}
                  onChange={(e) => setEditForm({ ...editForm, skillId: e.target.value })}
                >
                  <option value="">Select a service...</option>
                  {skills.map(skill => (
                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                  ))}
                </select>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.featured}
                    onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                  />
                  Featured
                </label>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleSave}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="project-info">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  {project.featured && <span className="badge">Featured</span>}
                </div>
                <div className="project-actions">
                  <button className="btn btn-secondary" onClick={() => handleEdit(project)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(project.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .project-manager {
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
        .form-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: normal;
        }
        .form-group input[type="text"],
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
        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .project-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .project-info h3 {
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }
        .project-info p {
          margin: 0 0 0.5rem;
          color: var(--text-secondary);
        }
        .badge {
          background: var(--accent);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
        }
        .project-actions {
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
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
