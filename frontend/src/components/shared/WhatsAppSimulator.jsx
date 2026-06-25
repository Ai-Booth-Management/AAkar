"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function WhatsAppSimulator() {
  const [phone, setPhone] = useState('917696138229');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', type: 'text', text: 'WhatsApp Simulator active. Send "hi" to start registration.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (opts = {}) => {
    const text = opts.text !== undefined ? opts.text : input.trim();
    const isImage = opts.isImage || false;

    if (!text && !isImage) return;
    if (!isImage) setInput('');
    setLoading(true);

    if (isImage) {
      setMessages(prev => [...prev, { from: 'user', type: 'image', image: opts.imageData }]);
    } else {
      setMessages(prev => [...prev, { from: 'user', type: 'text', text }]);
    }

    try {
      const body = { phone };
      if (isImage) {
        body.is_image = true;
        body.image_data = opts.imageData.replace(/^data:image\/\w+;base64,/, '');
      } else {
        body.message = text;
      }

      const res = await fetch('/api/v1/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.replies && data.replies.length > 0) {
        data.replies.forEach(reply => {
          setMessages(prev => [...prev, { from: 'bot', type: 'text', text: reply }]);
        });
      } else {
        setMessages(prev => [...prev, { from: 'bot', type: 'text', text: '(no response)' }]);
      }
      if (data.conversation_state) {
        setConversationState(data.conversation_state);
      }
    } catch (e) {
      setMessages(prev => [...prev, { from: 'bot', type: 'text', text: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessages(prev => [...prev, { from: 'bot', type: 'text', text: 'Only image files are supported.' }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage({ isImage: true, imageData: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearConversation = async () => {
    setMessages([{ from: 'bot', type: 'text', text: 'Conversation reset. Send "hi" to start again.' }]);
    setConversationState(null);
  };

  return (
    <div style={{
      maxWidth: 520, margin: '0 auto', background: '#e5ddd5',
      borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#075e54', color: '#fff', padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>WhatsApp Simulator</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            Phone: {phone || '917696138229'}
          </div>
        </div>
        <button onClick={clearConversation} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          borderRadius: 6, padding: '6px 12px', fontSize: 10, fontWeight: 700,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Reset</button>
      </div>

      {/* Phone input */}
      <div style={{ padding: '8px 16px', background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            📱 Number
          </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="917696138229"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc',
              fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
            }}
          />
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%', padding: msg.type === 'image' ? 4 : '8px 14px', borderRadius: 8,
              fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
              background: msg.from === 'user' ? '#dcf8c6' : '#fff',
              borderBottomRightRadius: msg.from === 'user' ? 2 : 8,
              borderBottomLeftRadius: msg.from === 'user' ? 8 : 2,
              boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
            }}>
              {msg.type === 'image' ? (
                <img
                  src={msg.image}
                  alt="Uploaded"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }}
                />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '8px 14px', borderRadius: 8, background: '#fff', fontSize: 13,
              borderBottomLeftRadius: 2, boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
            }}>
              <span style={{ opacity: 0.5 }}>typing</span>
              <span className="typing-dots">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px', background: '#f0f0f0', borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image"
            style={{
              background: loading ? '#ccc' : '#075e54',
              border: 'none', color: '#fff', borderRadius: 8,
              padding: '0 14px', fontSize: 18, cursor: loading ? 'default' : 'pointer',
            }}
          >📎</button>
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#ccc' : '#075e54',
              border: 'none', color: '#fff', borderRadius: 8,
              padding: '0 18px', fontSize: 18, cursor: loading || !input.trim() ? 'default' : 'pointer',
            }}
          >➤</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}