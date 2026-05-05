export default function GalleryManager() {
  return (
    <div className="gallery-manager">
      <style>{`
        .gallery-manager {
          max-width: 800px;
        }
        .gallery-header {
          margin-bottom: 2rem;
        }
        .gallery-header h2 {
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }
        .gallery-header p {
          margin: 0;
          color: var(--text-secondary);
        }
        .coming-soon {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 3rem;
          text-align: center;
        }
        .coming-soon-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #fff3e0;
          color: #e65100;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .coming-soon h3 {
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }
        .coming-soon p {
          margin: 0;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="gallery-header">
        <h2>Gallery</h2>
        <p>Upload and organize images for your website gallery.</p>
      </div>

      <div className="coming-soon">
        <span className="coming-soon-badge">Coming Soon</span>
        <h3>Gallery Management</h3>
        <p>This feature is currently under development.</p>
      </div>
    </div>
  );
}
