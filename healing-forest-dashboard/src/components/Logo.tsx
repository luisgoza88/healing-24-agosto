import React from 'react';

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-12 h-12 rounded-full border-2 border-hf-primary flex items-center justify-center bg-white">
        <span className="text-xl font-bold text-hf-dark">HF</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-hf-dark leading-5">Healing</h1>
        <h2 className="text-xl font-semibold text-hf-primary leading-5">Forest</h2>
      </div>
    </div>
  );
};

export const LogoIcon = ({ size = 40 }: { size?: number }) => {
  return (
    <div 
      className="rounded-full border-2 border-hf-primary flex items-center justify-center bg-white"
      style={{ width: size, height: size }}
    >
      <span className="font-bold text-hf-dark" style={{ fontSize: size * 0.4 }}>HF</span>
    </div>
  );
};