"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertTriangle, TrendingUp, Users } from 'lucide-react';

function renderMarkdown(text) {
    if (!text) return text;
    // Split into lines and process
    const lines = text.split('\n');
    return lines.map((line, i) => {
        // Bold: **text**
        let parts = [];
        let remaining = line;
        let key = 0;
        while (remaining.includes('**')) {
            const start = remaining.indexOf('**');
            if (start > 0) parts.push(<span key={key++}>{remaining.slice(0, start)}</span>);
            const afterStart = remaining.slice(start + 2);
            const end = afterStart.indexOf('**');
            if (end === -1) { parts.push(<span key={key++}>{remaining.slice(start)}</span>); remaining = ''; break; }
            parts.push(<strong key={key++}>{afterStart.slice(0, end)}</strong>);
            remaining = afterStart.slice(end + 2);
        }
        if (remaining) parts.push(<span key={key++}>{remaining}</span>);

        const isNumbered = /^\d+\.\s/.test(line.trim());
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('- ');

        if (isNumbered || isBullet) {
            return <div key={i} style={{ paddingLeft: isBullet ? 16 : 8, marginBottom: 4 }}>{parts}</div>;
        }
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
        return <div key={i} style={{ marginBottom: 4 }}>{parts}</div>;
    });
}

function getTimeStr() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function AICopilot({ hierarchy }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'ai',
            text: 'Hello there! How can I help you today?',
            time: getTimeStr()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const sendMessage = async (text) => {
        const now = getTimeStr();
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, time: now }]);
        setIsThinking(true);

        try {
            const API_URL = process.env.NODE_ENV === 'development'
                ? 'http://localhost:8000/api/v1/ask-election'
                : '/api/v1/ask-election';

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    question: text,
                    shortcut: null
                }),
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data = await res.json();
            const aiResponse = data.answer || "I've analyzed the data for you.";

            setIsThinking(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ai',
                text: aiResponse,
                time: getTimeStr()
            }]);
        } catch (error) {
            console.error("AI Copilot Error:", error);
            setIsThinking(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ai',
                text: "I'm having trouble connecting to the intelligence node. Please verify the backend service is running.",
                time: getTimeStr()
            }]);
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleQuickSend = (text) => {
        if (isThinking) return;
        sendMessage(text);
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            minHeight: 'calc(100vh - 80px)',
            background: '#f8fafc', 
            overflow: 'hidden', 
            width: '100%'
        }}>
            
            {/* Premium Header */}
            <div style={{ 
                padding: '20px 28px', 
                background: 'var(--navy-900)', 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background element */}
                <div style={{ position: 'absolute', top: '-50%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212, 168, 67, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(212, 168, 67, 0.05) 100%)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        <Bot size={24} color="#fbbf24" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.02em' }}>AI Strategy Assistant</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Intelligence Node Active
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ 
                    padding: '8px 16px', 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 800, 
                    color: '#fbbf24',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <Sparkles size={14} />
                    Ready for Analysis
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ 
                flex: 1, 
                padding: '32px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px',
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {/* Role label + timestamp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: msg.role === 'ai' ? '44px' : 0, paddingRight: msg.role === 'user' ? '44px' : 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: msg.role === 'ai' ? '#0f172a' : '#475569' }}>
                                {msg.role === 'ai' ? 'AI Strategy Assistant' : 'You'}
                            </span>
                            {msg.time && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{msg.time}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', maxWidth: '85%' }}>
                            {msg.role === 'ai' && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--navy-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                    <Bot size={18} color="#fbbf24" />
                                </div>
                            )}
                            
                            <div style={{ 
                                padding: '16px 20px', 
                                borderRadius: '16px',
                                backgroundColor: msg.role === 'user' ? 'var(--navy-900)' : '#ffffff',
                                color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                                boxShadow: msg.role === 'user' ? '0 8px 16px -4px rgba(15, 23, 42, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.06)',
                                border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                                borderBottomRightRadius: msg.role === 'user' ? 4 : '16px',
                                borderBottomLeftRadius: msg.role === 'ai' ? 4 : '16px',
                                fontSize: '14px',
                                lineHeight: 1.7,
                                fontWeight: 500
                            }}>
                                {msg.role === 'ai' ? renderMarkdown(msg.text) : msg.text}
                            </div>
                            
                            {msg.role === 'user' && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '4px', border: '1px solid #cbd5e1' }}>
                                    <Users size={16} color="#475569" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '44px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>AI Strategy Assistant</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{getTimeStr()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--navy-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                <Bot size={18} color="#fbbf24" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '14px 20px', borderRadius: '16px', borderBottomLeftRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div className="bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue-500)', animationDelay: '0s' }} />
                                    <div className="bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue-500)', animationDelay: '0.2s' }} />
                                    <div className="bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue-500)', animationDelay: '0.4s' }} />
                                </div>
                                <span style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>Sure, fetching the data...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '24px 32px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: '#f8fafc', 
                    border: '1.5px solid #cbd5e1', 
                    borderRadius: '24px', 
                    padding: '8px 8px 8px 24px', 
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                className="input-container-focus"
                >
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about booth metrics, volunteer activity, or district strategy..."
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: 500, color: '#0f172a' }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        style={{ 
                            background: input.trim() && !isThinking ? 'var(--blue-600)' : '#cbd5e1', 
                            color: '#ffffff', 
                            border: 'none', 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed', 
                            transition: 'all 0.2s',
                            boxShadow: input.trim() && !isThinking ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none'
                        }}
                        className={input.trim() && !isThinking ? "hover-scale" : ""}
                    >
                        <Send size={18} style={{ marginLeft: '-2px' }} />
                    </button>
                </div>
                
                {/* Quick Suggestion Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    {[
                        { label: 'Total Volunteers', icon: '👥' },
                        { label: 'Total Complaints', icon: '📋' },
                        { label: 'Open Complaints', icon: '⚠️' },
                        { label: 'Election Focus', icon: '🎯' },
                        { label: 'Complaints by Type', icon: '📊' },
                        { label: 'Active Volunteers', icon: '✅' },
                    ].map(({ label }) => (
                        <button
                            key={label}
                            onClick={() => handleQuickSend(label)}
                            disabled={isThinking}
                            style={{
                                padding: '6px 14px',
                                background: isThinking ? '#f8fafc' : '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#475569',
                                cursor: isThinking ? 'not-allowed' : 'pointer',
                                opacity: isThinking ? 0.5 : 1,
                                transition: 'all 0.15s',
                                outline: 'none',
                            }}
                            onMouseEnter={e => { if (!isThinking) e.currentTarget.style.background = '#e2e8f0'; }}
                            onMouseLeave={e => { if (!isThinking) e.currentTarget.style.background = '#f1f5f9'; }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                
                .bounce { animation: bounce 1.4s infinite ease-in-out both; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                
                .hover-scale:hover { transform: scale(1.05); }
                
                .input-container-focus:focus-within {
                    border-color: var(--blue-400) !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
                    background: white !important;
                }
            `}} />
        </div>
    );
}
