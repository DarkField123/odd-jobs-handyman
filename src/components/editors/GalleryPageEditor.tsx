import { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase/client';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

interface PageData {
  id: string;
  title?: string;
  images?: GalleryImage[];
}

interface GalleryPageEditorProps {
  pageData: PageData | null;
}

export function GalleryPageEditor({ pageData }: GalleryPageEditorProps) {
  const [images, setImages] = useState<GalleryImage[]>(pageData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages: GalleryImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageId = `gallery-${Date.now()}-${i}`;
        const storageRef = ref(storage, `gallery/${imageId}`);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        newImages.push({
          id: imageId,
          url,
          alt: file.name.replace(/\.[^/.]+$/, ''),
          order: images.length + i
        });
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);

      // Save to Firestore
      await updateDoc(doc(db, 'pages', 'gallery'), {
        images: updatedImages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from storage
      const storageRef = ref(storage, `gallery/${imageId}`);
      await deleteObject(storageRef).catch(() => {});

      // Update state and Firestore
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);

      await updateDoc(doc(db, 'pages', 'gallery'), {
        images: updatedImages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleUpdateAlt = async (imageId: string) => {
    try {
      const updatedImages = images.map(img =>
        img.id === imageId ? { ...img, alt: editAlt } : img
      );
      setImages(updatedImages);

      await updateDoc(doc(db, 'pages', 'gallery'), {
        images: updatedImages,
        updatedAt: serverTimestamp()
      });

      setEditingImage(null);
    } catch (error) {
      console.error('Error updating image:', error);
    }
  };

  const handleReorder = async (imageId: string, direction: 'up' | 'down') => {
    const index = images.findIndex(img => img.id === imageId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const updatedImages = [...images];
    [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
    updatedImages.forEach((img, i) => img.order = i);

    setImages(updatedImages);

    try {
      await updateDoc(doc(db, 'pages', 'gallery'), {
        images: updatedImages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error reordering images:', error);
    }
  };

  return (
    <div className="gallery-editor">
      <div className="editor-header">
        <h1>Gallery Management</h1>
        <label className="upload-btn btn btn-primary">
          {isUploading ? 'Uploading...' : 'Upload Images'}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <p className="editor-description">
        Manage the images shown in your gallery. Drag to reorder or click to edit descriptions.
      </p>

      <div className="images-grid">
        {images.length === 0 ? (
          <div className="empty-state">
            No images yet. Upload some images to get started.
          </div>
        ) : (
          images.map((image, index) => (
            <div key={image.id} className="image-card">
              <img src={image.url} alt={image.alt} />
              <div className="image-overlay">
                <div className="reorder-buttons">
                  <button
                    onClick={() => handleReorder(image.id, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >
                    &uarr;
                  </button>
                  <button
                    onClick={() => handleReorder(image.id, 'down')}
                    disabled={index === images.length - 1}
                    title="Move down"
                  >
                    &darr;
                  </button>
                </div>
                <div className="image-actions">
                  <button onClick={() => {
                    setEditingImage(image.id);
                    setEditAlt(image.alt);
                  }}>
                    Edit
                  </button>
                  <button className="delete" onClick={() => handleDelete(image.id)}>
                    Delete
                  </button>
                </div>
              </div>
              {editingImage === image.id && (
                <div className="edit-alt">
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Image description"
                  />
                  <button onClick={() => handleUpdateAlt(image.id)}>Save</button>
                  <button onClick={() => setEditingImage(null)}>Cancel</button>
                </div>
              )}
              <div className="image-caption">{image.alt}</div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .gallery-editor {
          padding: 2rem;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .editor-header h1 {
          margin: 0;
          color: var(--text-primary);
        }
        .upload-btn {
          cursor: pointer;
        }
        .editor-description {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          background: #f9f9f9;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
        }
        .image-card {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .image-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.5rem;
        }
        .image-card:hover .image-overlay {
          opacity: 1;
        }
        .reorder-buttons {
          display: flex;
          gap: 0.25rem;
        }
        .reorder-buttons button {
          background: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .reorder-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .image-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .image-actions button {
          background: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .image-actions button.delete {
          background: #f44336;
          color: white;
        }
        .edit-alt {
          position: absolute;
          bottom: 40px;
          left: 0;
          right: 0;
          background: white;
          padding: 0.75rem;
          display: flex;
          gap: 0.5rem;
        }
        .edit-alt input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
        }
        .edit-alt button {
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          background: var(--accent);
          color: white;
        }
        .edit-alt button:last-child {
          background: #f5f5f5;
          color: var(--text-primary);
        }
        .image-caption {
          padding: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          background: white;
        }
      `}</style>
    </div>
  );
}
