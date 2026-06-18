"use client";
import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertTriangle, TrendingUp, Users } from 'lucide-react';

export default function AICopilot({ hierarchy }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'ai',
            text: 'How can I assist with your election strategy today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const handleSend = () => {
        if (!input.trim()) return;

        const userText = input;
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
        setInput('');
        setIsThinking(true);

        setTimeout(() => {
            setIsThinking(false);
            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'ai', 
                text: "No data available to analyze. Please ensure the system is connected to a data source." 
            }]);
        }, 1500);
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 220px)', 
            background: 'white', 
            borderRadius: '12px', 
            border: '1.5px solid var(--gray-200)', 
            overflow: 'hidden', 
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            margin: '0 auto',
            maxWidth: '1200px'
        }}>
            
            {/* Premium Header */}
            <div style={{ 
                padding: '16px 24px', 
                background: 'linear-gradient(135deg, var(--blue-600) 0%, var(--blue-700) 100%)', 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '38px', 
                        height: '38px', 
                        background: 'rgba(212, 168, 67, 0.15)', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(212, 168, 67, 0.3)'
                    }}>
                        <Bot size={22} color="var(--amber-500)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>AI Strategy Assistant</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Intelligence Node Active
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ 
                    padding: '6px 12px', 
                    background: 'rgba(255,255,255,0.08)', 
                    borderRadius: '6px', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    color: 'var(--amber-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    Ready for Analysis
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ 
                flex: 1, 
                padding: '24px', 
                overflowY: 'auto', 
                backgroundColor: '#f1f5f9', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px' 
            }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                            maxWidth: '80%', 
                            padding: '14px 18px', 
                            borderRadius: '12px',
                            backgroundColor: msg.role === 'user' ? 'var(--blue-600)' : 'white',
                            color: msg.role === 'user' ? 'white' : 'var(--gray-900)',
                            boxShadow: msg.role === 'user' ? '0 4px 12px rgba(26, 39, 68, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--gray-200)',
                            borderTopRightRadius: msg.role === 'user' ? 2 : '12px',
                            borderTopLeftRadius: msg.role === 'ai' ? 2 : '12px',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            fontWeight: 500,
                            position: 'relative'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gray-500)', fontSize: '13px', fontWeight: 600, padding: '8px' }}>
                        <div className="pulse" style={{ width: '18px', height: '18px', background: 'var(--gray-200)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bot size={12} />
                        </div>
                        <span className="pulse">Synthesizing strategy...</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid var(--gray-200)' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: '#f8fafc', 
                    border: '1.5px solid var(--gray-200)', 
                    borderRadius: '12px', 
                    padding: '10px 16px', 
                    gap: '14px',
                    transition: 'all 0.2s ease'
                }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about booth metrics, volunteer activity, or district strategy..."
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: 500, color: 'var(--gray-900)' }}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        style={{ 
                            background: 'var(--blue-600)', 
                            color: 'white', 
                            border: 'none', 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed', 
                            opacity: input.trim() && !isThinking ? 1 : 0.5,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
            `}} />
        </div>
    );
}
