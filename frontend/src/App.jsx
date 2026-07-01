import { useState } from 'react';
import DocumentDashboard from './components/DocumentDashboard';
import FloatingChat from './components/FloatingChat';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [viewedDoc, setViewedDoc] = useState(null);

  // Auto-select and preview document upon successful upload
  const handleUploadSuccess = (newDoc) => {
    setDocuments([newDoc]);
    setViewedDoc(newDoc);
    setSelectedDocId(newDoc.id);
  };

  // Reset active context states on close
  const handleCloseDoc = () => {
    setViewedDoc(null);
    setSelectedDocId(null);
    setDocuments([]);
  };

  return (
    <>
      {/* Header Bar */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className="logo-text">ChatDoc AI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--color-primary)', borderRadius: '50%' }}></span>
          <span>Workspace Environment: Local Prototype</span>
        </div>
      </header>

      {/* Main Content Area */}
      <DocumentDashboard 
        viewedDoc={viewedDoc}
        setViewedDoc={setViewedDoc}
        onCloseDoc={handleCloseDoc}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Floating Chat Box Overlay */}
      <FloatingChat 
        selectedDocId={selectedDocId}
        documents={documents}
      />
    </>
  );
}

export default App;
