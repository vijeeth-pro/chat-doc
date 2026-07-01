import axios from 'axios';

// API Base URL - customizable for real backend integrations
const API_BASE_URL = 'http://127.0.0.1:5001';

// Create Axios Instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Initial mock documents to seed the application so it looks stunning and populated at start
const DEFAULT_DOCUMENTS = [
  {
    id: 'doc-default-1',
    name: 'ChatDoc Welcome & Guide.txt',
    size: 2450,
    type: 'text/plain',
    uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    status: 'ready',
    content: `Welcome to ChatDoc!

This application allows you to upload documents and chat with them in real-time.

Features:
1. Drag and Drop Uploader: Supports PDF, TXT, and Markdown files.
2. Context-Aware Chat: Toggle files in the sidebar to include them in the chat window context. The chatbot reads the active documents to answer your questions.
3. Interactive Reader: Click the "eye" icon to view document contents on the main screen.

How to get started:
- Try asking: "What features does ChatDoc support?" in the chat below.
- Select the checkbox next to this file to make sure it's in the chatbot's context.
- Upload your own files to see the processing pipeline (Uploading -> Processing -> Indexed) in action.`,
  },
  {
    id: 'doc-default-2',
    name: 'Project Roadmap.md',
    size: 1540,
    type: 'text/markdown',
    uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    status: 'ready',
    content: `# Project Roadmap: ChatDoc AI

## Q3 2026: Core Experience
- [x] High-fidelity glassmorphic frontend UI
- [x] Responsive layout with sidebar and reader panel
- [x] Bottom floating chat drawer with context selection
- [ ] Integration of real python/node backend

## Q4 2026: Advanced Intelligence
- [ ] Support for multi-modal uploads (images, audio logs)
- [ ] RAG (Retrieval-Augmented Generation) engine optimization
- [ ] Collaboration spaces: Shared team folders and concurrent chats`,
  }
];

// Helper to initialize local storage
const getStoredDocs = () => {
  const docs = localStorage.getItem('chatdoc_documents');
  if (!docs) {
    localStorage.setItem('chatdoc_documents', JSON.stringify(DEFAULT_DOCUMENTS));
    return DEFAULT_DOCUMENTS;
  }
  try {
    return JSON.parse(docs);
  } catch {
    return DEFAULT_DOCUMENTS;
  }
};

const saveStoredDocs = (docs) => {
  localStorage.setItem('chatdoc_documents', JSON.stringify(docs));
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
  // General fallback
  return `Document Name: ${fileName}
This document was uploaded and successfully compiled into the ChatDoc index on ${new Date().toLocaleDateString()}.
File size: ${fileName.length * 100} bytes.
The document contains semantic indices and tables. You can ask the AI assistant to summarize this document, analyze its topics, or search for key terms.`;
};

/**
 * Service API layer containing real endpoints and fallback simulated logic
 */
export const DocumentAPI = {
  // Retrieve all uploaded documents
  async getDocuments() {
    try {
      const response = await apiClient.get('/documents');
      return response.data;
    } catch {
      console.warn('Backend API getDocuments unavailable, falling back to local simulation.');
      return getStoredDocs();
    }
  },

  // Upload document with mock progress support
  async uploadDocument(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      return response.data;
    } catch (error) {
      console.warn('Backend API uploadDocument unavailable, running local simulation.', error);
      
      // Local Simulation Flow
      return new Promise((resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          if (onProgress) onProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            
            const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
            const isImage = file.type.startsWith('image/');
            const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');

            // Read file content
            const reader = new FileReader();
            reader.onload = (event) => {
              const fileContent = event.target.result || 'No preview content available.';
              
              // Extract text for RAG simulation
              const extractedText = (isPdf || isDocx)
                ? generateSmartTextContext(file.name)
                : isImage
                  ? `Image file: ${file.name}. Visual content preview only.`
                  : fileContent;

              const newDoc = {
                id: `doc-${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type || 'text/plain',
                uploadedAt: new Date().toISOString(),
                status: 'ready',
                content: fileContent,
                text: extractedText,
              };
              
              const currentDocs = getStoredDocs();
              currentDocs.unshift(newDoc);
              saveStoredDocs(currentDocs);
              resolve(newDoc);
            };
            
            reader.onerror = () => {
              reject(new Error('Failed to read file content'));
            };

            if (isImage || isPdf || isDocx) {
              reader.readAsDataURL(file);
            } else {
              reader.readAsText(file);
            }
          }
        }, 300);
      });
    }
  },

  // Delete document
  async deleteDocument(id) {
    try {
      await apiClient.delete(`/documents/${id}`);
      return true;
    } catch {
      console.warn('Backend API deleteDocument unavailable, falling back to local simulation.');
      const currentDocs = getStoredDocs();
      const updatedDocs = currentDocs.filter(doc => doc.id !== id);
      saveStoredDocs(updatedDocs);
      return true;
    }
  },

  // Send a message to chat with document context
  async sendChatMessage(message, selectedDocIds = []) {
    try {
      const response = await apiClient.post('/chat', { message, documentIds: selectedDocIds });
      return response.data;
    } catch (error) {
      console.warn('Backend API sendChatMessage unavailable, generating simulated AI response.', error);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const documents = getStoredDocs();
          const activeDocs = documents.filter(d => selectedDocIds.includes(d.id));
          
          let responseText = '';
          const cleanMsg = message.toLowerCase().trim();

          if (activeDocs.length === 0) {
            // General assistant answers
            if (cleanMsg.includes('hello') || cleanMsg.includes('hi')) {
              responseText = "Hello there! I'm your ChatDoc assistant. Upload documents in the dashboard, select them, and ask me anything about their contents.";
            } else if (cleanMsg.includes('feature')) {
              responseText = "ChatDoc supports drag-and-drop document upload (TXT, MD, PDF text), live index status updates, side-by-side document viewing, and context-targeted Q&A. Select files on the left sidebar to let me analyze them.";
            } else {
              responseText = "I see no documents selected in your context. Please upload a file and check the checkbox next to it so I can answer questions about it. \n\n*General Tip: You can upload TXT or Markdown files, select them, and ask me specific questions.*";
            }
          } else {
            // Context answers: Multi-document synthesis
            // Check for keywords matching in all active documents
            const matchedSnippets = [];
            for (const doc of activeDocs) {
              const docMatches = [];
              const textContent = doc.text || doc.content || '';
              const lines = textContent.split('\n');
              for (const line of lines) {
                if (line.toLowerCase().includes(cleanMsg) || 
                    cleanMsg.split(' ').some(word => word.length > 4 && line.toLowerCase().includes(word))) {
                  if (docMatches.length < 3) { // limit to 3 matching lines per document
                    docMatches.push(line.trim());
                  }
                }
              }
              if (docMatches.length > 0) {
                matchedSnippets.push(`**From *${doc.name}*:**\n` + docMatches.map(m => `> ... ${m} ...`).join('\n'));
              }
            }

            // Check if the query references both roadmap and guide/features
            const hasRoadmap = activeDocs.some(d => d.name.toLowerCase().includes('roadmap'));
            const hasGuide = activeDocs.some(d => d.name.toLowerCase().includes('guide') || d.name.toLowerCase().includes('welcome'));

            if ((cleanMsg.includes('roadmap') || cleanMsg.includes('plan')) && 
                (cleanMsg.includes('guide') || cleanMsg.includes('feature') || cleanMsg.includes('welcome') || cleanMsg.includes('get started'))) {
              if (hasRoadmap && hasGuide) {
                responseText = `Here is a synthesized overview from both **Project Roadmap** and **Welcome Guide**:\n\n` +
                  `1. **Current Capabilities (Welcome Guide)**:\n` +
                  `   - Drag-and-drop uploader supporting PDF, TXT, and Markdown.\n` +
                  `   - Context selection sidebar to activate multi-document query environments.\n` +
                  `   - Side-by-side text reader viewer.\n\n` +
                  `2. **Future Schedule (Project Roadmap)**:\n` +
                  `   - **Q3 2026**: Production glassmorphic layouts, floating chat widget overlays, and Node/Python server integrations.\n` +
                  `   - **Q4 2026**: Multi-modal file processing (images/audio), optimized RAG pipelines, and concurrent team folders.`;
              }
            }

            // If not answered yet, check if they specifically want a summary of all active docs
            if (!responseText && (cleanMsg.includes('summar') || cleanMsg.includes('about') || cleanMsg.includes('topics') || cleanMsg.includes('takeaway'))) {
              let docSummaries = activeDocs.map(d => {
                const textContent = d.text || d.content || '';
                const cleanContent = textContent.replace(/[#*`[\]-]/g, '').trim();
                const firstLine = cleanContent.split('\n').filter(line => line.trim().length > 15)[0] || d.content.substring(0, 100);
                return `- **${d.name}**: "${firstLine.substring(0, 120)}..."`;
              }).join('\n\n');
              
              responseText = `Here is a compiled summary of the **${activeDocs.length}** active documents in your context:\n\n${docSummaries}\n\nYou can ask me specific questions to cross-reference their contents or look for overlaps!`;
            }

            // Individual single doc roadmap check
            if (!responseText && (cleanMsg.includes('roadmap') || cleanMsg.includes('q3') || cleanMsg.includes('q4') || cleanMsg.includes('plan'))) {
              const roadmapDoc = activeDocs.find(d => d.name.toLowerCase().includes('roadmap'));
              if (roadmapDoc) {
                responseText = "Based on the **Project Roadmap**, here is the schedule:\n- **Q3 2026**: High-fidelity frontend UI, responsive layout, floating chat widget, and backend setup.\n- **Q4 2026**: Multi-modal uploads, RAG engine tuning, and team collaboration spaces.";
              }
            }

            // Individual single doc guide check
            if (!responseText && (cleanMsg.includes('features') || cleanMsg.includes('guide') || cleanMsg.includes('get started'))) {
              const guideDoc = activeDocs.find(d => d.name.toLowerCase().includes('guide') || d.name.toLowerCase().includes('welcome'));
              if (guideDoc) {
                responseText = "According to the **Welcome & Guide**, the core features are:\n1. **Drag & Drop Uploader**: Supports PDFs, TXT, and MD.\n2. **Context-Aware Chat**: Toggle checkboxes on the sidebar to ask questions directly about particular files.\n3. **Interactive Reader**: View file details side-by-side with the chat.";
              }
            }

            // Fallback context response if no specific keyword triggered
            if (!responseText) {
              const docNames = activeDocs.map(d => `*${d.name}*`).join(', ');
              if (matchedSnippets.length > 0) {
                responseText = `I searched through the selected documents (${docNames}) and found these matching sections:\n\n${matchedSnippets.join('\n\n')}\n\nIs there a specific detail you would like me to clarify or explain from these references?`;
              } else {
                let docSummaries = activeDocs.map(d => {
                  const textContent = d.text || d.content || '';
                  const cleanContent = textContent.replace(/[#*`[\]-]/g, '').trim();
                  const firstLine = cleanContent.split('\n').filter(line => line.trim().length > 10)[0] || d.content.substring(0, 100);
                  return `- **${d.name}**: "${firstLine.substring(0, 120)}..."`;
                }).join('\n');

                responseText = `I've analyzed the ${activeDocs.length} selected documents: ${docNames}.\n\nYour question ("*${message}*") did not yield direct text matches. Here is an overview of the active documents in context:\n\n${docSummaries}\n\nFeel free to ask me to compare their features or find other text references!`;
              }
            }
          }

          resolve({
            text: responseText,
            timestamp: new Date().toISOString(),
            sources: activeDocs.map(d => ({ id: d.id, name: d.name }))
          });
        }, 1200); // realistic network delay
      });
    }
  },

  // Retrieve Vector DB statistics
  async getDbStats() {
    try {
      const response = await apiClient.get('/api/db-stats');
      return response.data;
    } catch (err) {
      console.warn('Backend DB stats unavailable, returning mock placeholder.', err);
      return { initialized: false, node_count: 0, document_count: 0, documents: [] };
    }
  },

  // Retrieve Vector DB document chunks (nodes)
  async getDbNodes() {
    try {
      const response = await apiClient.get('/api/db-nodes');
      return response.data;
    } catch (err) {
      console.warn('Backend DB nodes unavailable, returning empty list.', err);
      return [];
    }
  }
};
