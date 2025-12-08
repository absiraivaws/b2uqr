
'use client'

import React, { useEffect, useState } from 'react';

export const BackgroundGraph: React.FC = () => {
  const [points, setPoints] = useState<string>('');
  const [areaPath, setAreaPath] = useState<string>('');
  
  // Simulation of growth data
  const generateData = () => {
      // 12 data points representing a year or sequence
      const baseValues = [20, 35, 30, 45, 55, 48, 65, 75, 70, 85, 95, 110];
      return baseValues.map(v => v + Math.random() * 5);
  };

  useEffect(() => {
    const data = generateData();
    const maxVal = 120;
    
    // Calculate SVG points
    const pts = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (val / maxVal) * 90; // Scale to keep it in view, leave padding top
        return `${x},${y}`;
    });

    const lineStr = pts.join(' ');
    setPoints(lineStr);

    // Area is line points + bottom corners
    const areaStr = `${lineStr} 100,100 0,100 Z`;
    setAreaPath(areaStr);

  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[45vh] w-full z-[1] pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
      <svg 
        className="w-full h-full" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ed1a8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2ed1a8" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Animated Area Fill */}
        <path 
          d={areaPath} 
          fill="url(#chartGradient)" 
          className="transition-all duration-[2000ms] ease-out origin-bottom transform scale-y-100" 
        />
        
        {/* Animated Line */}
        <polyline 
          points={points} 
          fill="none" 
          stroke="#2ed1a8" 
          strokeWidth="0.5" 
          vectorEffect="non-scaling-stroke"
          className="drop-shadow-[0_0_10px_rgba(46,209,168,0.5)]"
        />
        
      </svg>
      
      {/* Subtle Grid overlay for 'financial' look */}
      <div 
        className="absolute inset-0 w-full h-full opacity-20"
        style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};
