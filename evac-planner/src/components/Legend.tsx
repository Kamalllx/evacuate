import React from 'react';

const Legend: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 24,
      right: 24,
      background: 'rgba(30,34,44,0.95)',
      color: '#fff',
      padding: '12px 18px',
      borderRadius: '8px',
      fontSize: '14px',
      zIndex: 1000,
      minWidth: '180px',
    }}
  >
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Legend</div>
    <div>
      <span style={{ color: '#21c521', fontWeight: 700 }}>●</span> Starting Point
    </div>
    <div>
      <span style={{ color: '#d22', fontWeight: 700 }}>●</span> Destination
    </div>
    <div>
      <span style={{ color: '#ff3300', fontWeight: 700 }}>■</span> Blockage
    </div>
    <div>
      <span style={{ color: '#0275d8', fontWeight: 700 }}>━</span> Evacuation Route
    </div>
  </div>
);

export default Legend;
