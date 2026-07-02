'use client';

import { useState } from 'react';
import { Home, Users, MapPin, CheckCircle, ChevronRight, Search, Sparkles } from 'lucide-react';
import { assignCampaignTaskAction } from '@/app/boothman/actions';

interface House {
  house_no: string;
  section: string;
  voterCount: number;
}

interface Volunteer {
  id: number;
  name: string;
  phone: string;
}

interface Task {
  title: string;
  status: string;
}

interface CampaignBoardProps {
  houses: House[];
  volunteers: Volunteer[];
  boothId: number;
  tasks?: Task[];
}

export default function CampaignBoard({ houses, volunteers, boothId, tasks = [] }: CampaignBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');

  const navy = "#0f172a";
  const gold = "#D4AF37";
  const slate50 = "#f8fafc";
  const slate100 = "#f1f5f9";
  const slate200 = "#e2e8f0";
  const slate400 = "#94a3b8";
  const slate500 = "#64748b";
  const slate900 = "#0f172a";
  const green50 = "#f0fdf4";
  const green200 = "#bbf7d0";
  const green700 = "#15803d";
  const indigo50 = "#eef2ff";
  const indigo100 = "#e0e7ff";
  const indigo700 = "#4338ca";
  const indigo900 = "#312e81";
  const white = "#ffffff";

  const filteredHouses = houses.filter((h: any) => 
    h.house_no.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleHouseSelect = (house: House) => {
    setSelectedHouse(house);
    setSelectedVolunteerId('');
    setAiReasoning('');
  };

  const handleAssign = async () => {
    if (!selectedHouse || !selectedVolunteerId) return;
    
    setIsSubmitting(true);
    setSuccessMessage('');
    
    try {
      const res = await assignCampaignTaskAction(boothId, Number(selectedVolunteerId), selectedHouse.house_no);
      if (res.success) {
        setSuccessMessage('House assigned to be covered');
        setTimeout(() => setSuccessMessage(''), 3000);
        setSelectedHouse(null);
        setSelectedVolunteerId('');
        setAiReasoning('');
      } else {
        alert(res.error || 'Failed to assign task');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedHouse) return;
    setIsAiLoading(true);
    setAiReasoning('');
    
    try {
      const res = await fetch('/api/coordinator/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothId, houseNo: selectedHouse.house_no })
      });
      
      const data = await res.json();
      if (res.ok && data.volunteerId) {
        setSelectedVolunteerId(data.volunteerId);
        setAiReasoning(data.reasoning);
      } else {
        alert(data.error || 'Failed to get AI suggestion');
      }
    } catch (err) {
      alert('An error occurred while connecting to AI');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <div style={{ gridColumn: '1 / span 2', backgroundColor: white, border: `1px solid ${slate200}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '700px' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${slate100}`, backgroundColor: slate50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Home size={16} color={gold} /> Households ({houses.length})
          </h3>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: slate400 }} size={14} />
            <input 
              type="text" 
              placeholder="Search house or section..." 
              style={{ padding: '8px 16px 8px 36px', fontSize: '13px', borderRadius: '8px', border: `1px solid ${slate200}`, outline: 'none', width: '250px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', alignContent: 'start' }}>
          {filteredHouses.map((house) => {
            const isSelected = selectedHouse?.house_no === house.house_no;
            return (
              <div 
                key={house.house_no} 
                onClick={() => handleHouseSelect(house)}
                style={{ 
                  border: `1px solid ${isSelected ? gold : slate200}`, 
                  borderRadius: '12px', 
                  padding: '16px', 
                  cursor: 'pointer', 
                  backgroundColor: isSelected ? '#fefce8' : white,
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 0 1px #D4AF37' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: navy, fontSize: '14px' }}>
                    <Home size={16} color={isSelected ? gold : slate400} />
                    House #{house.house_no}
                  </div>
                  {tasks.some(t => t.title.includes(`House #${house.house_no}`)) ? (
                    <div style={{ backgroundColor: green50, color: green700, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={10} /> House assigned to be covered
                    </div>
                  ) : (
                    <div style={{ backgroundColor: slate100, color: slate500, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={10} /> {house.voterCount} Voters
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: slate500, display: 'flex', alignItems: 'flex-start', gap: '4px', fontWeight: 500 }}>
                  <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: slate400 }} />
                  <span>{house.section}</span>
                </div>
              </div>
            );
          })}
          {filteredHouses.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: slate500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={32} color={slate200} style={{ marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, fontSize: '14px' }}>No households found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ backgroundColor: white, border: `1px solid ${slate200}`, borderRadius: '16px', padding: '24px', position: 'sticky', top: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', paddingBottom: '16px', borderBottom: `1px solid ${slate100}`, fontSize: '14px', fontWeight: 900, color: navy, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color={gold} /> Task Assignment
          </h3>
          
          {successMessage && (
            <div style={{ marginBottom: '16px', backgroundColor: green50, color: green700, fontSize: '13px', fontWeight: 600, padding: '12px', borderRadius: '8px', border: `1px solid ${green200}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} />
              {successMessage}
            </div>
          )}

          {!selectedHouse ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: slate400, backgroundColor: slate50, borderRadius: '12px', border: `1px dashed ${slate200}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ChevronRight size={32} color={slate200} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.5 }}>Select a household from the list<br/>to assign a volunteer.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#fefce8', padding: '16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Target Location</div>
                <div style={{ fontWeight: 900, color: navy, fontSize: '18px' }}>House #{selectedHouse.house_no}</div>
                <div style={{ fontSize: '13px', color: slate500, marginTop: '4px', fontWeight: 500 }}>{selectedHouse.section}</div>
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: white, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, color: slate500, border: `1px solid ${slate200}` }}>
                  <Users size={12} color={gold} />
                  {selectedHouse.voterCount} Target Voters
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: slate500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign to Volunteer</label>
                  <button 
                    style={{ fontSize: '10px', fontWeight: 900, color: gold, backgroundColor: '#fefce8', padding: '4px 8px', borderRadius: '6px', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: (isAiLoading || volunteers.length === 0) ? 'not-allowed' : 'pointer', opacity: (isAiLoading || volunteers.length === 0) ? 0.5 : 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || volunteers.length === 0}
                  >
                    <Sparkles size={12} />
                    {isAiLoading ? 'Analyzing...' : 'Smart Suggest'}
                  </button>
                </div>
                
                <select 
                  style={{ width: '100%', padding: '10px', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: navy, outline: 'none' }}
                  value={selectedVolunteerId}
                  onChange={e => setSelectedVolunteerId(e.target.value as unknown as number)}
                >
                  <option value="" disabled>-- Select a Volunteer --</option>
                  {volunteers.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.phone})</option>
                  ))}
                </select>
                {volunteers.length === 0 && (
                  <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px', fontWeight: 600 }}>No approved volunteers available in your booth.</p>
                )}
              </div>

              {aiReasoning && (
                <div style={{ background: `linear-gradient(to right, ${indigo50}, #e0e7ff)`, border: `1px solid ${indigo100}`, padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: indigo700, fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    <Sparkles size={14} /> AI Recommendation
                  </div>
                  <p style={{ fontSize: '13px', color: indigo900, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                    "{aiReasoning}"
                  </p>
                </div>
              )}

              <button 
                style={{ width: '100%', backgroundColor: gold, color: navy, fontWeight: 900, padding: '14px', borderRadius: '10px', border: 'none', cursor: (!selectedVolunteerId || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!selectedVolunteerId || isSubmitting) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                onClick={handleAssign}
                disabled={!selectedVolunteerId || isSubmitting}
              >
                {isSubmitting ? 'Assigning...' : 'Assign Campaign Task'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
