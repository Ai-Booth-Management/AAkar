import React from 'react';

const MapSelector = ({ activeCategory, setActiveCategory, categories, currentUser, setSelectedDistrict }) => {
    const navy = "#04122e";
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
                <h2 style={{ margin: 0, color: navy, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em' }}>
                    Civic Hotline Hotspots
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Select a category to filter active voter reports and assigned command metrics
                </p>
            </div>
            
            <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 6 }}>
                {categories.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => {
                            setActiveCategory(cat.key);
                            if (currentUser?.role !== 'dm') {
                                setSelectedDistrict(null);
                            }
                        }}
                        style={{
                            border: 'none',
                            outline: 'none',
                            padding: '8px 16px',
                            borderRadius: 4,
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: activeCategory === cat.key ? navy : 'transparent',
                            color: activeCategory === cat.key ? '#ffffff' : '#475569'
                        }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MapSelector;
