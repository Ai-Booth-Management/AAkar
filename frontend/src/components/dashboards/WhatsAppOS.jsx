"use client";
import React, { useState } from 'react';
import { Send, Mic, Phone, Video, MoreVertical, CheckCheck, Camera, Paperclip, CheckSquare, Users, BarChart3, Clock } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function WhatsAppOS({ hierarchy }) {
    const [messages, setMessages] = useState([
        { id: 1, type: 'system', text: 'Welcome to Politix OS. You are securely connected to the Central Command.', time: '09:00 AM' },
        { id: 2, type: 'incoming', text: 'Good morning Booth President. Here are the tasks for today.', time: '09:01 AM' },
        { id: 3, type: 'incoming', isCard: true, cardType: 'tasks', time: '09:01 AM' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const boothId = hierarchy.booth || 'B102';
    
    // Theme Colors mimicking a secure mobile app
    const teal = "#128C7E";
    const darkTeal = "#075E54";
    const lightGreen = "#E1FFC7";
    const white = "#ffffff";
    const bgGray = "#ece5dd";
    
    const handleSend = () => {
        if (!inputText.trim()) return;
        const newMsg = { id: Date.now(), type: 'outgoing', text: inputText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        setMessages([...messages, newMsg]);
        setInputText('');

        // Mock automated response
        setTimeout(() => {
            const cmd = inputText.toUpperCase();
            let reply = { id: Date.now(), type: 'incoming', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
            
            if (cmd.includes('MEETING')) {
                reply.isCard = true;
                reply.cardType = 'meeting';
            } else if (cmd.includes('STATUS')) {
                reply.isCard = true;
                reply.cardType = 'status';
            } else if (cmd.includes('TASK')) {
                reply.isCard = true;
                reply.cardType = 'tasks';
            } else {
                reply.text = `Command recognized. Awaiting further input or tap below: \n• TASKS\n• MEETING\n• STATUS`;
            }
            setMessages(prev => [...prev, reply]);
        }, 1000);
    };

    const handleQuickAction = (cmd) => {
        setInputText(cmd);
        setTimeout(() => document.getElementById('send-btn').click(), 100);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#e2e8f0', minHeight: 'calc(100vh - 100px)', padding: '20px' }}>
            {/* Mobile Frame Container */}
            <div style={{ width: '100%', maxWidth: '480px', backgroundColor: bgGray, display: 'flex', flexDirection: 'column', height: '80vh', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '8px solid #0f172a' }}>
                
                {/* Header */}
                <div style={{ backgroundColor: darkTeal, color: white, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: white, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={logo} alt="Logo" style={{ height: '24px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>Command Center</span>
                            <span style={{ fontSize: '12px', opacity: 0.8 }}>online • Booth {boothId}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Video size={20} />
                        <Phone size={20} />
                        <MoreVertical size={20} />
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundImage: `url('https://transparenttextures.com/patterns/cubes.png')`, backgroundSize: '100px' }}>
                    {messages.map(msg => (
                        <ChatMessage key={msg.id} msg={msg} lightGreen={lightGreen} teal={teal} />
                    ))}
                    <div style={{ paddingBottom: '20px' }} />
                </div>

                {/* Quick Actions */}
                <div style={{ padding: '8px 12px', display: 'flex', gap: '8px', overflowX: 'auto', backgroundColor: '#f0f2f5', borderTop: '1px solid #d1d5db' }}>
                    <button onClick={() => handleQuickAction('TASKS')} style={{ padding: '6px 16px', backgroundColor: white, border: '1px solid #d1d5db', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: teal, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Tasks</button>
                    <button onClick={() => handleQuickAction('MEETING')} style={{ padding: '6px 16px', backgroundColor: white, border: '1px solid #d1d5db', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: teal, cursor: 'pointer', whiteSpace: 'nowrap' }}>👥 Meeting</button>
                    <button onClick={() => handleQuickAction('STATUS')} style={{ padding: '6px 16px', backgroundColor: white, border: '1px solid #d1d5db', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: teal, cursor: 'pointer', whiteSpace: 'nowrap' }}>📊 Status</button>
                </div>

                {/* Input Area */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'transparent', gap: '8px' }}>
                    <div style={{ flex: 1, backgroundColor: white, borderRadius: '24px', display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <Camera size={24} color="#8696a0" />
                        <Paperclip size={20} color="#8696a0" />
                        <input 
                            type="text" 
                            placeholder="Type a message or command..." 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px' }}
                        />
                    </div>
                    {inputText.trim() ? (
                        <button id="send-btn" onClick={handleSend} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: teal, color: white, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                            <Send size={20} style={{ marginLeft: '4px' }} />  
                        </button>
                    ) : (
                        <button onClick={() => setIsRecording(!isRecording)} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isRecording ? '#ef4444' : teal, color: white, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'background-color 0.2s' }}>
                            <Mic size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatMessage({ msg, lightGreen, teal }) {
    if (msg.type === 'system') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <div style={{ backgroundColor: '#D4AF371A', border: '1px solid #D4AF3733', color: '#b45309', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', textAlign: 'center', maxWidth: '80%' }}>
                    {msg.text}
                </div>
            </div>
        );
    }

    const isOut = msg.type === 'outgoing';

    return (
        <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
            <div style={{ 
                backgroundColor: isOut ? lightGreen : 'white', 
                padding: '8px 12px', 
                borderRadius: '12px',
                borderTopRightRadius: isOut ? 0 : '12px',
                borderTopLeftRadius: !isOut ? 0 : '12px',
                maxWidth: '85%',
                boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
            }}>
                {msg.isCard ? (
                    <CardContent type={msg.cardType} />
                ) : (
                    <div style={{ fontSize: '15px', color: '#111b21', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#667781' }}>{msg.time}</span>
                    {isOut && <CheckCheck size={14} color="#53bdeb" />}
                </div>
            </div>
        </div>
    );
}

function CardContent({ type }) {
    if (type === 'tasks') {
        return (
            <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={16} color="#128C7E" /> Pending Tasks
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                    <li>Distribute 50 pamphlets in Sector 4</li>
                    <li>Verify 12 missing names on Roll</li>
                    <li>Submit daily attendance</li>
                </ul>
            </div>
        );
    }
    
    if (type === 'meeting') {
        return (
            <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} color="#3b82f6" /> Log Meeting
                </div>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>Please reply with a voice note summarizing the meeting, or tap below:</div>
                <button style={{ width: '100%', padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Open Form</button>
            </div>
        );
    }

    if (type === 'status') {
        return (
            <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart3 size={16} color="#8b5cf6" /> Booth Status
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>BOSI Score:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>84/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Active Vol.:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>12</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Turnout Est.:</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>62%</span>
                </div>
            </div>
        );
    }

    return null;
}
