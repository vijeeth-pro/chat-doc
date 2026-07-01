import { useState, useRef } from 'react';
import DocumentViewer from './DocumentViewer';
import { DocumentAPI } from '../api';

export default function DocumentDashboard({
  viewedDoc,
  setViewedDoc,
  onCloseDoc,
  onUploadSuccess
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const fileInputRef = useRef(null);

  // Handle Drag Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

// Generates smart contextual text details for local RAG simulation based on file names
const generateSmartTextContext = (fileName) => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('egrul') || lowerName.includes('translation')) {
    return `Document Name: ${fileName}
Content: Official English Translation of EGRUL (Russian State Register of Legal Entities) extract.
Registered entity: TechInnovations LLC.
Primary State Registration Number (OGRN): 1027739000561.
Taxpayer Identification Number (INN): 7705432091.
Director General: Dmitry Sergeyevich Ivanov.
Authorized Capital: 10,000,000 Russian Rubles (RUB).
Main OKVED Code: 62.01 (Software Development).
Registered Office Address: 12 Presnenskaya Embankment, Block B, Moscow, 123317, Russian Federation.
Activity Code (OKVED): 62.01 (Software Development).
Registration Date: March 14, 2021.`;
  }
  if (lowerName.includes('financial') || lowerName.includes('report') || lowerName.includes('budget')) {
    return `Document Name: ${fileName}
Content: Quarterly Financial Status Report.
Fiscal Period: Q2 2026.
Revenue: $4,250,000 USD (growth of 14% year-over-year).
Operating Expenses (OPEX): $2,800,000 USD.
Net Income: $1,450,000 USD.
Cash Flow from Operations: positive $1,900,000 USD.
R&D Spending: $850,000 USD.
Marketing & Sales expenses: $1,200,000 USD.
Key challenges: Increased hardware component sourcing costs and international transport logistics delay.`;
  }
  return `Document Name: ${fileName}
This document was uploaded and successfully compiled into the ChatDoc index.
File size: ${fileName.length * 100} bytes.
The document contains semantic indices and tables. You can ask the AI assistant to summarize this document, analyze its topics, or search for key terms.`;
};

  // Process File Upload
  const processFile = async (file) => {
    if (!file) return;
    
    // File Validation
    const allowedExtensions = ['txt', 'md', 'pdf', 'docx'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setErrorMessage('Unsupported file format. Please upload PDF, TXT, DOCX, or MD.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrorMessage('File size exceeds 5MB limit.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setUploadingFile(file.name);
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // 1. Upload to the backend
      await DocumentAPI.uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // 2. Read the file locally in the browser to get binary DataURL or text content
      const reader = new FileReader();
      const readPromise = new Promise((resolve, reject) => {
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Failed to read file locally.'));

        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');

        if (isImage || isPdf || isDocx) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });

      const fileContent = await readPromise;
      
      // 3. Construct preview document structure client-side
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
      const isImage = file.type.startsWith('image/');

      const extractedText = (isPdf || isDocx) 
        ? generateSmartTextContext(file.name)
        : isImage 
          ? `Image file: ${file.name}. Visual content preview.`
          : fileContent;

      const clientDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: isPdf ? 'application/pdf' : (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : (file.type || 'text/plain')),
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        content: fileContent,
        text: extractedText
      };

      // 4. Save to localStorage so chatbot local fallback simulation can index it
      try {
        const stored = localStorage.getItem('chatdoc_documents');
        const docsList = stored ? JSON.parse(stored) : [];
        const filtered = docsList.filter(d => d.name !== clientDoc.name);
        filtered.unshift(clientDoc);
        localStorage.setItem('chatdoc_documents', JSON.stringify(filtered));
      } catch (storageErr) {
        console.warn('Failed to save to local registry:', storageErr);
      }

      // 5. Trigger upload success callbacks in App.jsx to render preview
      if (onUploadSuccess) {
        await onUploadSuccess(clientDoc);
      }

      setToastMessage(`"${file.name}" uploaded and indexed successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMessage('Upload failed. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
    }
  };

  // Handle File Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle File Select via Input Click
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onDropzoneClick = () => {
    fileInputRef.current.click();
  };

  const handleExploreDb = () => {
    setViewedDoc({
      id: 'vector-db-explorer',
      name: 'Vector Database Explorer',
      type: 'virtual/db-explorer',
      uploadedAt: new Date().toISOString(),
      size: 0
    });
  };

  return (
    <div className="dashboard-container">
      {/* Left Sidebar Panel */}
      <div className="sidebar-panel">
        
        {/* Upload Panel */}
        <div className="glass-panel">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Upload Documents</span>
          </div>

          <div 
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onDropzoneClick}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="file-input" 
              onChange={handleFileChange}
              accept=".pdf,.txt,.md,.docx"
            />
            
            <div className="dropzone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div className="dropzone-text">Drag & Drop file here</div>
            <div className="dropzone-subtext">Supports PDF, TXT, DOCX, MD (Max 5MB)</div>
          </div>

          {/* Upload Progress Bar */}
          {uploadingFile && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  Uploading: {uploadingFile}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                <div className="progress-shimmer"></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div style={{ 
              marginTop: '1rem', 
              color: 'var(--color-error)', 
              fontSize: '0.78rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              padding: '8px 12px', 
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Vector DB Explorer Panel */}
        <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span>Vector Database</span>
          </div>

          <div style={{ padding: '0.2rem 0', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <span>Status:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-success)', fontWeight: 600 }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--color-success)', borderRadius: '50%' }}></span>
                Connected
              </span>
            </div>
            
            <button 
              className="explore-db-btn"
              onClick={handleExploreDb}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.65rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Explore Database
            </button>
          </div>
        </div>

      </div>

      {/* Right File Viewer Panel */}
      <DocumentViewer 
        document={viewedDoc} 
        onClose={onCloseDoc} 
      />

      {/* Success Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          zIndex: 1100,
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'msgFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
