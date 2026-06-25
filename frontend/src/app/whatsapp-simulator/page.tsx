"use client";
import React from 'react';
import WhatsAppSimulator from '../../components/shared/WhatsAppSimulator';
import Link from 'next/link';

export default function WhatsAppSimulatorPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 520, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/election" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none' }}>
          ← Back to Election
        </Link>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Offline Mode
        </span>
      </div>
      <WhatsAppSimulator />
    </div>
  );
}
