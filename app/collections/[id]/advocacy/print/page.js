'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function AdvocacyPrintView() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [colRes, billsRes] = await Promise.all([
          fetch('/api/collections'),
          fetch(`/api/collections/${id}/bills`),
        ]);
        const colData = await colRes.json();
        const billsData = await billsRes.json();
        
        const col = (colData.collections || []).find(c => c.id === id);
        setCollection(col);
        setBills(billsData.bills || []);
        
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Compiling Packet...</div>;

  return (
    <div className="print-packet">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          .sidebar, .top-header, .page-header, .btn, nav { display: none !important; }
          .app-layout { padding: 0 !important; margin: 0 !important; max-width: 100% !important; border: none !important; }
          .print-packet { padding: 0 !important; box-shadow: none !important; }
          .page-break { page-break-after: always; }
          .no-break { page-break-inside: avoid; }
        }
        .print-packet { max-width: 800px; margin: 0 auto; background: white; padding: 40px; color: black; font-family: sans-serif; }
        .packet-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .bill-entry { border: 1px solid #ccc; border-radius: 8px; padding: 24px; margin-bottom: 30px; }
        .bill-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 16px; }
        .content-section { margin-bottom: 20px; font-size: 14px; }
        .content-section h4 { text-transform: uppercase; font-size: 12px; color: #444; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; }
        .prose p { margin-bottom: 10px; line-height: 1.5; }
        .prose ul, .prose ol { margin-left: 24px; margin-bottom: 12px; }
        .prose li { margin-bottom: 6px; }
        .prose strong { font-weight: 600; }
        .status-badge { background: #f0f0f0; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
      `}} />
      
      <button 
        className="btn btn-primary" 
        onClick={() => window.print()} 
        style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        🖨️ Print / Save to PDF
      </button>

      <div className="packet-header">
        <h1 style={{ fontSize: '32px', margin: 0, fontWeight: 800 }}>{collection?.name || 'Advocacy Packet'}</h1>
        {collection?.description && <p style={{ fontSize: '18px', color: '#444', marginTop: '12px' }}>{collection.description}</p>}
        <p style={{ fontSize: '12px', color: '#777', marginTop: '16px' }}>Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {bills.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No bills in this collection.</p>
      ) : (
        bills.map(b => (
          <div key={b.billId} className="bill-entry no-break">
            <div className="bill-header">
              <h2 style={{ fontSize: '22px', margin: 0, color: '#000' }}>
                <span style={{ fontSize: '14px', background: '#000', color: '#fff', padding: '3px 8px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '10px' }}>{b.jurisdiction || '—'}</span>
                {b.billNumber || b.billId}
              </h2>
              <div style={{ textAlign: 'right', fontSize: '14px' }}>
                {b.targetStance && (
                  <strong style={{ display: 'inline-block', padding: '6px 12px', border: '2px solid #000', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Stance: {b.targetStance}
                  </strong>
                )}
              </div>
            </div>

            <div className="content-section" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 2 }}>
                <h4 style={{ margin: 0, marginBottom: '6px' }}>Bill Title</h4>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', lineHeight: 1.4 }}>{b.billTitle}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid #ccc', paddingLeft: '24px' }}>
                <h4 style={{ margin: 0, marginBottom: '6px' }}>Current Status</h4>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  <span className="status-badge">{['Introduced','Engrossed','Enrolled','Passed','Vetoed','Failed'][b.status-1] || 'Pending/Other'}</span>
                  <br/>
                  <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '4px' }}>As of {new Date(b.lastActionDate).toLocaleDateString()}</span>
                </p>
              </div>
            </div>

            {b.talkingPoints && (
              <div className="content-section" style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#000', borderBottomColor: '#ccc' }}>Key Talking Points</h4>
                <div className="prose" dangerouslySetInnerHTML={{ __html: b.talkingPoints }} />
              </div>
            )}

            {b.considerations && (
              <div className="content-section" style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '6px', borderLeft: '4px solid #666', marginTop: '20px' }}>
                <h4 style={{ color: '#000', borderBottomColor: '#ccc' }}>Internal Considerations & Notes</h4>
                <div className="prose" dangerouslySetInnerHTML={{ __html: b.considerations }} />
              </div>
            )}
            
            {(!b.talkingPoints && !b.considerations) && (
              <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No advocacy notes drafted for this bill.</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
