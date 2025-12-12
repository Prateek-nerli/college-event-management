import React from "react";

export const BackgroundDesign = () => {
  return (
    <div 
      style={{
        position: 'absolute', // Forces it to overlay/underlay
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        backgroundColor: 'white',
        zIndex: 0 // Ensure it sits behind content
      }}
    >
      {/* 1. Outer Frame Container (Simulates padding) */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',    // p-5 is approx 20px
          left: '20px',
          right: '20px',
          bottom: '20px',
        }}
      >
        {/* 2. Main Gold Border Frame */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            border: '3px solid #c5a059',
            // Double line effect
            boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 6px #c5a059' 
          }}
        >
          {/* 3. Corner Ornaments */}
          {/* Top Left */}
          <div style={{ position: 'absolute', top: -3, left: -3, width: 96, height: 96, borderTop: '6px solid #c5a059', borderLeft: '6px solid #c5a059' }} />
          
          {/* Top Right */}
          <div style={{ position: 'absolute', top: -3, right: -3, width: 96, height: 96, borderTop: '6px solid #c5a059', borderRight: '6px solid #c5a059' }} />
          
          {/* Bottom Left */}
          <div style={{ position: 'absolute', bottom: -3, left: -3, width: 96, height: 96, borderBottom: '6px solid #c5a059', borderLeft: '6px solid #c5a059' }} />
          
          {/* Bottom Right */}
          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 96, height: 96, borderBottom: '6px solid #c5a059', borderRight: '6px solid #c5a059' }} />

          {/* 4. Center Watermark */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.03 }}>
             <div style={{ width: 450, height: 450, borderRadius: '50%', border: '20px solid #c5a059' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};