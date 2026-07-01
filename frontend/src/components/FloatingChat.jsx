import { useState, useRef, useEffect } from 'react';
import { DocumentAPI } from '../api';

export default function FloatingChat({ selectedDocId, documents }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hi there! 👋 I am your ChatDoc assistant. Select a document in the sidebar to enable it as context, then ask me anything!",
      timestamp: new Date().toISOString(),
    }
  ]);

  const messagesEndRef = useRef(null);

  // Auto Scroll to Bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Handle Send Message
  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isTyping) return;

    // Add user message
    const userMsg = {
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await DocumentAPI.sendChatMessage(text, selectedDocId ? [selectedDocId] : []);
      
      const aiMsg = {
        sender: 'ai',
        text: response.text,
        timestamp: response.timestamp || new Date().toISOString(),
        sources: response.sources || []
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat failed:', err);
      const errorMsg = {
        sender: 'ai',
        text: "Sorry, I encountered an issue processing that query. Please make sure the backend is active or try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Get active document
  const activeDoc = documents.find(d => d.id === selectedDocId);

  // Standard suggested questions based on selected documents
  const getSuggestedPrompts = () => {
    if (!selectedDocId) {
      return [
        "What features does ChatDoc support?",
        "How do I upload a document?"
      ];
    }
    
    const prompts = ["Summarize document content", "What are the main topics?"];
    const isRoadmap = activeDoc?.name.toLowerCase().includes('roadmap');
    const isGuide = activeDoc?.name.toLowerCase().includes('guide') || activeDoc?.name.toLowerCase().includes('welcome');

    if (isRoadmap) {
      prompts.push("Show Roadmap for Q3 2026", "What is planned for Q4?");
    }
    if (isGuide) {
      prompts.push("List guide setup features");
    }

    return prompts;
  };

  return (
    <div className="floating-chat-container">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="chat-window">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">CD</div>
              <div>
                <div className="chat-title">ChatDoc Assistant</div>
                <div className="chat-status">
                  <span className="chat-status-dot"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
            
            <button className="action-btn" onClick={() => setIsOpen(false)} aria-label="Close Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Context Banner */}
          {selectedDocId && activeDoc ? (
            <div style={{ padding: '6px 1.25rem', background: 'rgba(139, 92, 246, 0.05)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span>Context: </span>
              <span className="chat-context-badge">{activeDoc.name}</span>
            </div>
          ) : (
            <div style={{ padding: '6px 1.25rem', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--color-error)' }}>
              ⚠️ No file active. Conversing with general AI.
            </div>
          )}

          {/* Messages Log */}
          <div className="chat-messages chat-scroll">
            {messages.map((msg, index) => (
              <div key={index} className={`message-bubble ${msg.sender}`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                
                {/* Render source tags if exists */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Sources: {msg.sources.map(s => s.name).join(', ')}
                  </div>
                )}
                
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message-bubble ai" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Suggested Questions */}
          <div style={{ padding: '0.5rem 1.25rem 0', background: 'rgba(9, 10, 15, 0.9)' }}>
            <div className="suggested-container">
              <span className="suggested-label">Suggested Questions:</span>
              <div className="suggested-prompts">
                {getSuggestedPrompts().map((prompt, i) => (
                  <button 
                    key={i} 
                    className="suggested-chip" 
                    onClick={() => handleSend(prompt)}
                    disabled={isTyping}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Input Area */}
          <div className="chat-input-container">
            <input 
              type="text" 
              className="chat-input"
              placeholder="Ask a question about your docs..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
            />
            <button 
              className="send-btn" 
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              aria-label="Send Message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button (FAB) */}
      <button 
        className="chat-fab" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chat Helper"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        
        {/* Context indicator badge count */}
        {selectedDocId && (
          <span className="chat-fab-badge" title="Document in context"></span>
        )}
      </button>
    </div>
  );
}
