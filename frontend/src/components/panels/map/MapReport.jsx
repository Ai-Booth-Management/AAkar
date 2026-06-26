import React from 'react';

const MapReport = ({ details }) => {
    const navy = "#04122e";
    const navyLight = "#1a2744";
    const saffron = "#D4A843";

    return (
        <div className="card" style={{ background: navyLight, color: '#ffffff', border: '1px solid ' + navy, borderRadius: 4, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', color: saffron, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                Informational Report to the DM
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '12px' }}>
                <div>
                    <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        INCIDENT SUMMARY
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {details.what}
                    </span>
                </div>

                <div>
                    <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        AFFECTED LOCATIONS
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {details.where}
                    </span>
                </div>

                <div>
                    <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ACCOUNTABLE OFFICER
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontWeight: '800', color: '#ffffff', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {details.who}
                    </span>
                </div>

                <div>
                    <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        COMPLETED ACTIONS
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {details.action}
                    </span>
                </div>

                <div>
                    <span style={{ display: 'block', fontSize: '10px', color: saffron, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PENDING BLOCKERS
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontWeight: '600', color: '#f1f5f9', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {details.pending}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MapReport;
