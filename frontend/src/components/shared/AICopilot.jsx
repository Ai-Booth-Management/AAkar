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
            const query = userText.toLowerCase();
            let aiResponse = { id: Date.now() + 1, role: 'ai' };

            if (query.includes('weakest') || query.includes('weak')) {
                aiResponse.text = "Here are the booths requiring immediate intervention based on current data:";
                aiResponse.card = 'weak_booths';
            } else if (query.includes('summary') || query.includes('district')) {
                aiResponse.text = "Aggregated summary of your jurisdiction:";
                aiResponse.card = 'summary';
            } else {
                aiResponse.text = "Current data indicates stable operations. I recommend focusing volunteer drives in low-engagement sectors to boost pre-poll sentiment.";
            }

            setMessages(prev => [...prev, aiResponse]);
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
                        {msg.card && (
                            <div style={{ marginTop: '12px', width: '100%', maxWidth: '90%' }}>
                                <AICard type={msg.card} />
                            </div>
                        )}
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
                {/* Suggestions */}
                {messages.length === 1 && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', flexWrap: 'wrap', padding: '10px 0' }}>
                        <SuggestionButton text="Analyze booth performance" onClick={() => setInput("Show weak booths")} />
                        <SuggestionButton text="Generate jurisdiction summary" onClick={() => setInput("Generate summary")} />
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

function SuggestionButton({ text, onClick }) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                padding: '10px 18px', 
                background: 'white', 
                border: '1.5px solid var(--gray-200)', 
                borderRadius: '10px', 
                fontSize: '13px', 
                fontWeight: 700, 
                color: 'var(--blue-600)', 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'var(--blue-600)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)'; }}
        >
            {text}
        </button>
    );
}

function AICard({ type }) {
    if (type === 'weak_booths') {
        return (
            <div style={{ background: 'white', border: '1px solid #fecaca', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#dc2626', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}>
                    <AlertTriangle size={18} /> High Vulnerability Nodes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>
                        <div><strong style={{ color: '#991b1b' }}>Booth B104</strong><div style={{ fontSize: '12px', color: '#b91c1c' }}>Turnout Trend: -12%</div></div>
                        <div style={{ fontWeight: 900, color: '#dc2626' }}>38% Est</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>
                        <div><strong style={{ color: '#991b1b' }}>Booth B156</strong><div style={{ fontSize: '12px', color: '#b91c1c' }}>Personnel Shortage</div></div>
                        <div style={{ fontWeight: 900, color: '#dc2626' }}>45% Est</div>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'summary') {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--navy)', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}>
                        <Users size={16} /> Total Readiness
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--navy)' }}>82%</div>
                    <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '4px' }}>Optimal Threshold Met</div>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--gold)', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}>
                        <TrendingUp size={16} /> Turnout Projection
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--navy)' }}>64.5%</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: 800 }}>+2.1% YoY</div>
                </div>
            </div>
        );
    }

    return null;
}
