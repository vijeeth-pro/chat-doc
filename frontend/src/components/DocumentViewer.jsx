import { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { DocumentAPI } from '../api';

// Subcomponent to handle the lifecycle and rendering of DOCX binary blobs in the DOM
function DocxRenderer({ documentContent }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!documentContent || !containerRef.current) return;

    // Clear previous render contents
    containerRef.current.innerHTML = '';

    try {
      // Decode base64 Data URL back into a binary Uint8Array
      const base64Parts = documentContent.split(',');
      const byteString = atob(base64Parts[1]);
      const mimeString = base64Parts[0].split(':')[1].split(';')[0];
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });

      // Render the DOCX file natively
      renderAsync(blob, containerRef.current, null, {
        className: 'docx-preview-content',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        debug: false
      });
    } catch (err) {
      console.error('Error rendering docx document:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding: 3rem; text-align: center; color: #ef4444; font-family: system-ui, sans-serif;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem; opacity: 0.8;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="15"></line>
              <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
            <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Unable to Render Document</h4>
            <p style="font-size: 0.8rem; color: #9ca3af; margin: 0;">${err.message}</p>
          </div>
        `;
      }
    }
  }, [documentContent]);

  return (
    <div 
      ref={containerRef} 
      className="docx-viewer-element"
      style={{ 
        width: '100%', 
        height: '100%',
        overflowY: 'auto'
      }} 
    />
  );
}

function VectorDbExplorer() {
  const [stats, setStats] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const statsData = await DocumentAPI.getDbStats();
        const nodesData = await DocumentAPI.getDbNodes();
        setStats(statsData);
        setNodes(nodesData);
      } catch (err) {
        console.error('Failed to load DB details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredNodes = nodes.filter(node => 
    node.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)' }}>
        <div className="typing-indicator" style={{ marginBottom: '1rem' }}>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        <span>Loading Vector Database details...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', background: '#111217', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Stats Header Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Chunks (Nodes)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '4px' }}>{stats?.node_count || 0}</div>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Indexed Files</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{stats?.document_count || 0}</div>
        </div>
        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Embedding Dimensions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6', marginTop: '4px' }}>{stats?.node_count > 0 ? '3072' : '—'}</div>
        </div>
      </div>

      {/* Main split dashboard list + detail */}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* Node Chunks List */}
        <div style={{ width: '45%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search bar */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              placeholder="Search index chunks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* List items */}
          <div className="chat-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
            {filteredNodes.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No chunks matched your search.
              </div>
            ) : (
              filteredNodes.map(node => (
                <div 
                  key={node.id} 
                  onClick={() => setSelectedNode(node)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    background: selectedNode?.id === node.id ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{node.file_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{node.id.substring(0, 8)}...</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                    {node.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Chunk Details */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {selectedNode ? (
            <div style={{ padding: '1.25rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Node ID</span>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#3b82f6', background: 'rgba(59,130,246,0.05)', padding: '6px 10px', borderRadius: '4px', marginTop: '4px', border: '1px solid rgba(59,130,246,0.1)' }}>{selectedNode.id}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Document File</span>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#10b981' }}>
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  {selectedNode.file_name}
                </div>
              </div>

              {selectedNode.page_number && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Document Page Context</span>
                  <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '4px' }}>Page {selectedNode.page_number}</div>
                </div>
              )}

              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Semantic Chunk Text Content</span>
                <div style={{ flexGrow: 1, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                  {selectedNode.full_text}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.4 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span style={{ fontSize: '0.88rem' }}>Select a node chunk from the list to inspect its semantic text metadata and relationships.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function DocumentViewer({ document, onClose }) {
  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Custom Markdown parser for txt/md files
  const parseMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      // Headers
      if (trimmed.startsWith('# ')) {
        return <h1 key={index} style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{trimmed.slice(2)}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={index} style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginTop: '1.25rem', marginBottom: '0.5rem', fontSize: '1.4rem' }}>{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={index} style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.20rem' }}>{trimmed.slice(4)}</h3>;
      }
      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.4rem', color: '#cbd5e1', listStyleType: 'disc' }}>{trimmed.slice(2)}</li>;
      }
      if (trimmed.match(/^\d+\.\s/)) {
        return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.4rem', color: '#cbd5e1', listStyleType: 'decimal' }}>{trimmed.replace(/^\d+\.\s/, '')}</li>;
      }
      // Blockquotes
      if (trimmed.startsWith('> ')) {
        return <blockquote key={index} style={{ borderLeft: '3px solid var(--color-primary)', background: 'rgba(139, 92, 246, 0.05)', padding: '8px 12px', margin: '0.5rem 0 1rem', borderRadius: '0 4px 4px 0', color: '#94a3b8', fontStyle: 'italic' }}>{trimmed.slice(2)}</blockquote>;
      }
      // Empty line
      if (trimmed === '') {
        return <div key={index} style={{ height: '0.5rem' }}></div>;
      }
      // Standard paragraph
      return <p key={index} style={{ marginBottom: '0.8rem', color: '#cbd5e1', lineHeight: '1.6' }}>{line}</p>;
    });
  };

  // Styled Microsoft Word simulator for docx files
  const renderWordMockup = (doc) => {
    return (
      <div style={{ background: '#1e1f29', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', border: '1px solid var(--border-color)' }}>
        {/* Word Top Ribbon */}
        <div style={{ background: '#2b579a', color: '#fff', padding: '10px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: '900', background: '#fff', color: '#2b579a', padding: '2px 7px', borderRadius: '3px', fontSize: '0.9rem' }}>W</span>
            <span style={{ fontWeight: '600', letterSpacing: '0.2px' }}>{doc.name} — MS Word Viewer</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', opacity: 0.85, fontSize: '0.75rem' }}>
            <span>File</span>
            <span style={{ borderBottom: '2px solid #fff', paddingBottom: '2px' }}>Home</span>
            <span>Insert</span>
            <span>Layout</span>
            <span>References</span>
          </div>
        </div>
        
        {/* Toolbar */}
        <div style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', padding: '6px 16px', display: 'flex', gap: '1.5rem', alignItems: 'center', color: '#374151', fontSize: '0.75rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid #d1d5db', paddingRight: '12px' }}>
            <button style={{ border: 'none', background: 'transparent', padding: '2px 6px', cursor: 'default', fontWeight: 'bold' }}>B</button>
            <button style={{ border: 'none', background: 'transparent', padding: '2px 6px', cursor: 'default', fontStyle: 'italic' }}>I</button>
            <button style={{ border: 'none', background: 'transparent', padding: '2px 6px', cursor: 'default', textDecoration: 'underline' }}>U</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid #d1d5db', paddingRight: '12px', alignItems: 'center' }}>
            <span style={{ background: '#fff', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: '3px' }}>Times New Roman</span>
            <span style={{ background: '#fff', padding: '2px 6px', border: '1px solid #c8c8c8', borderRadius: '3px' }}>12</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', color: '#6b7280' }}>
            <span>Page Width Mode</span>
          </div>
        </div>
        
        {/* Page Container holding the rendered docx pages */}
        <div style={{ flexGrow: 1, overflowY: 'auto', background: '#111217', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', height: '100%', minWidth: '320px', maxWidth: '850px' }}>
            <DocxRenderer documentContent={doc.content} />
          </div>
        </div>
      </div>
    );
  };

  // Render Document Panel depending on format
  const renderDocumentContent = (doc) => {
    if (doc.type === 'virtual/db-explorer') {
      return <VectorDbExplorer />;
    }
    const fileExt = doc?.name?.split('.').pop().toLowerCase();
    
    // 1. PDF Documents
    if (fileExt === 'pdf' || doc.type === 'application/pdf') {
      return (
        <div style={{ height: 'calc(100vh - 240px)', width: '100%' }}>
          <iframe 
            src={doc.content} 
            title={doc.name}
            width="100%" 
            height="100%" 
            style={{ border: 'none', borderRadius: '12px', background: '#fff', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' }}
          />
        </div>
      );
    }
    
    // 2. Images
    if (doc?.type?.startsWith('image/')) {
      return (
        <div style={{ 
          height: 'calc(100vh - 240px)', 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          overflow: 'auto'
        }}>
          <img 
            src={doc.content} 
            alt={doc.name} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      );
    }

    // 3. Word Documents (.docx)
    if (fileExt === 'docx') {
      return renderWordMockup(doc);
    }

    // 4. Text / Markdown / Code Files
    return (
      <div className="doc-text-content" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        {parseMarkdown(doc.content)}
      </div>
    );
  };

  return (
    <div className="viewer-panel glass-panel">
      {document ? (
        <>
          <div className="viewer-header">
            <div className="viewer-title-area">
              {document.type === 'virtual/db-explorer' ? (
                <div className="file-icon" style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                  DB
                </div>
              ) : (
                <div className={`file-icon ${document?.name?.split('.').pop().toLowerCase()}`}>
                  {document?.name?.split('.').pop().toUpperCase()}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
                  {document.name}
                </h2>
                {document.type !== 'virtual/db-explorer' && (
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Size: {formatSize(document.size)}</span>
                    <span>Uploaded: {formatDate(document.uploadedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button className="action-btn" onClick={onClose} aria-label="Close document">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="viewer-content" style={{ paddingRight: 0, overflowY: 'hidden' }}>
            {renderDocumentContent(document)}
          </div>
        </>
      ) : (
        <div className="viewer-placeholder">
          <div className="viewer-placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', opacity: 0.6 }}>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
            No Document Selected
          </h2>
          <p style={{ maxWidth: '320px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Select a document from the sidebar and click the view button to inspect its contents here.
          </p>
        </div>
      )}
    </div>
  );
}
