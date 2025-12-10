import React from "react";

export const BackgroundDesign = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-white">
      {/* 1. Outer Dark Frame */}
      <div className="absolute inset-0 border-[12px] border-slate-800" />
      
      {/* 2. Inner Gold/Yellow Frame */}
      <div className="absolute top-3 left-3 right-3 bottom-3 border-[4px] border-yellow-500" />

      {/* 3. Decorative Corners (Triangles) */}
      {/* Top Left */}
      <div className="absolute top-3 left-3 w-16 h-16 border-t-[4px] border-l-[4px] border-yellow-600 rounded-tl-lg" />
      {/* Top Right */}
      <div className="absolute top-3 right-3 w-16 h-16 border-t-[4px] border-r-[4px] border-yellow-600 rounded-tr-lg" />
      {/* Bottom Left */}
      <div className="absolute bottom-3 left-3 w-16 h-16 border-b-[4px] border-l-[4px] border-yellow-600 rounded-bl-lg" />
      {/* Bottom Right */}
      <div className="absolute bottom-3 right-3 w-16 h-16 border-b-[4px] border-r-[4px] border-yellow-600 rounded-br-lg" />

      {/* 4. Subtle Background Pattern (Optional Watermark effect) */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
            backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "20px 20px"
        }}
      />
    </div>
  );
};