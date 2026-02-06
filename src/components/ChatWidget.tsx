import { useState, useRef, useEffect } from 'react';
import { sendMessage, resetChat } from '../lib/ai/chatService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessage(trimmed);
      const botMessage: Message = { role: 'assistant', content: responseText };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Sorry, something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    resetChat();
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <span className="chat-title">Odd Jobs Assistant</span>
            <div className="chat-header-actions">
              <button onClick={handleNewChat} className="chat-header-btn"
                aria-label="New conversation" title="New conversation">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="chat-header-btn"
                aria-label="Close chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p><strong>Hello!</strong> I'm the Odd Jobs assistant.</p>
                <p>Describe the job you need done and I'll tell you which of our services covers it, plus a rough price guide.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message chat-message-${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message chat-message-assistant chat-loading">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            )}
            {error && (
              <div className="chat-error">{error}</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your job..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="chat-send-btn"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .chat-fab {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--accent, #E53935);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          z-index: 1000;
        }

        .chat-fab:hover {
          background: var(--accent-dark, #C62828);
          transform: scale(1.08);
        }

        .chat-panel {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 380px;
          height: 520px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: var(--accent, #E53935);
          color: #fff;
        }

        .chat-title {
          font-weight: 600;
          font-size: 1rem;
        }

        .chat-header-actions {
          display: flex;
          gap: 0.25rem;
        }

        .chat-header-btn {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.85;
          transition: opacity 0.2s ease;
        }

        .chat-header-btn:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.15);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #f5f5f5;
        }

        .chat-welcome {
          background: #fff;
          padding: 1rem;
          border-radius: 8px;
          color: #666;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .chat-welcome p {
          margin: 0 0 0.5rem 0;
        }

        .chat-welcome p:last-child {
          margin-bottom: 0;
        }

        .chat-message {
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .chat-message-user {
          align-self: flex-end;
          background: var(--accent, #E53935);
          color: #fff;
          border-bottom-right-radius: 2px;
        }

        .chat-message-assistant {
          align-self: flex-start;
          background: #fff;
          color: #333;
          border: 1px solid #e0e0e0;
          border-bottom-left-radius: 2px;
        }

        .chat-loading {
          display: flex;
          gap: 0.3rem;
          padding: 0.875rem 1rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #bbb;
          border-radius: 50%;
          animation: chatBounce 1.2s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        .chat-error {
          background: #ffebee;
          color: #c62828;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .chat-input-area {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid #e0e0e0;
          background: #fff;
        }

        .chat-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .chat-input:focus {
          border-color: var(--accent, #E53935);
        }

        .chat-input:disabled {
          opacity: 0.6;
        }

        .chat-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: var(--accent, #E53935);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          background: var(--accent-dark, #C62828);
        }

        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .chat-panel {
            width: calc(100vw - 1rem);
            height: calc(100vh - 6rem);
            bottom: 0.5rem;
            right: 0.5rem;
            border-radius: 8px;
          }

          .chat-fab {
            bottom: 1rem;
            right: 1rem;
          }
        }
      `}</style>
    </>
  );
}
