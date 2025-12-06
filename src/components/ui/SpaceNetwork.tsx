
import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  activeLevel: number; // 0 to 1, 1 being fully lit
}

interface Pulse {
  sourceIndex: number;
  targetIndex: number;
  progress: number; // 0 to 1
  speed: number;
}

interface SpaceNetworkProps {
    isDark?: boolean;
}

const SpaceNetwork: React.FC<SpaceNetworkProps> = ({ isDark = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    let height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    
    // World dimensions - scale relative to container
    const WORLD_WIDTH = width * 1.5;
    const WORLD_HEIGHT = height * 1.5;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
      } else {
        width = window.innerWidth;
        height = window.innerHeight;
      }
      canvas.width = width;
      canvas.height = height;
    };
    
    // Initial resize to catch parent dimensions
    resize();
    
    // Additional delay to catch flex/grid layout adjustments
    setTimeout(resize, 100);

    window.addEventListener('resize', resize);

    // Camera state - VERY SLOW
    const camera = { x: 0, y: 0, vx: 0.02, vy: 0.01 };

    // Initialize Nodes - GREATLY REDUCED COUNT
    const nodes: Node[] = [];
    // Adjust node count based on area approx
    const areaFactor = (width * height) / (1920 * 1080);
    const nodeCount = Math.max(15, Math.floor(25 * areaFactor)); 
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        vx: (Math.random() - 0.5) * 0.05, // Very slow drift
        vy: (Math.random() - 0.5) * 0.05,
        activeLevel: 0
      });
    }

    const pulses: Pulse[] = [];
    const maxConnectionDist = Math.max(width, height) * 0.4; // Responsive distance

    // Helper to spawn a pulse
    const triggerPulse = (sourceIdx: number) => {
      const neighbors: number[] = [];
      nodes.forEach((node, idx) => {
        if (idx === sourceIdx) return;
        const dx = node.x - nodes[sourceIdx].x;
        const dy = node.y - nodes[sourceIdx].y;
        if (Math.sqrt(dx*dx + dy*dy) < maxConnectionDist) {
          neighbors.push(idx);
        }
      });

      if (neighbors.length > 0) {
        // Limit to 1 target for cleaner look
        const targetIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
        pulses.push({
            sourceIndex: sourceIdx,
            targetIndex: targetIdx,
            progress: 0,
            speed: 0.005 + Math.random() * 0.01 // Very slow pulses
        });
      }
    };

    const triggerRandom = () => {
        // Rare random triggers
        if (Math.random() > 0.98) {
            triggerPulse(Math.floor(Math.random() * nodes.length));
        }
    }

    // Animation Loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Colors based on theme - UPDATED FOR VISIBILITY
      const nodeBaseColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(10, 30, 90, 0.6)'; // Increased base opacity for dark mode
      const pulseColor = isDark ? '46, 209, 168' : '0, 80, 200'; // Darker blue for light mode
      const impactColor = isDark ? '#fff' : '#0f172a';
      const shadowColor = isDark ? '#2ed1a8' : '#2563eb';

      // Move Camera
      camera.x += camera.vx;
      camera.y += camera.vy;
      
      if (camera.x > WORLD_WIDTH - width) camera.vx *= -1;
      if (camera.x < 0) camera.vx *= -1;
      if (camera.y > WORLD_HEIGHT - height) camera.vy *= -1;
      if (camera.y < 0) camera.vy *= -1;

      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Update Nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > WORLD_WIDTH) node.vx *= -1;
        if (node.y < 0 || node.y > WORLD_HEIGHT) node.vy *= -1;
        
        if (node.activeLevel > 0) node.activeLevel -= 0.005;
        if (node.activeLevel < 0) node.activeLevel = 0;
      });

      // Update and Draw Pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;
        
        const start = nodes[p.sourceIndex];
        const end = nodes[p.targetIndex];

        // Draw Line
        const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        grad.addColorStop(0, `rgba(${pulseColor}, 0)`);
        grad.addColorStop(0.5, `rgba(${pulseColor}, ${1 - Math.abs(p.progress - 0.5)*2})`);
        grad.addColorStop(1, `rgba(${pulseColor}, 0)`);
        
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = isDark ? 1.5 : 2; // Thicker lines in light mode
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Projectile head
        const currX = start.x + (end.x - start.x) * p.progress;
        const currY = start.y + (end.y - start.y) * p.progress;
        
        ctx.beginPath();
        ctx.fillStyle = impactColor;
        ctx.shadowBlur = 4;
        ctx.shadowColor = shadowColor;
        ctx.arc(currX, currY, isDark ? 2 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.progress >= 1) {
          nodes[p.targetIndex].activeLevel = 1;
          if (Math.random() > 0.7) { 
            triggerPulse(p.targetIndex);
          }
          pulses.splice(i, 1);
        }
      }

      // Draw Nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.fillStyle = nodeBaseColor;
        ctx.arc(node.x, node.y, isDark ? 2 : 3, 0, Math.PI * 2); // Slightly larger nodes in light mode
        ctx.fill();

        if (node.activeLevel > 0) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${pulseColor}, ${node.activeLevel})`;
          ctx.shadowBlur = 10 * node.activeLevel;
          ctx.shadowColor = shadowColor;
          ctx.arc(node.x, node.y, 4 + (node.activeLevel * 2), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${pulseColor}, ${node.activeLevel * 0.3})`;
          ctx.lineWidth = 1;
          ctx.arc(node.x, node.y, 6 + (1-node.activeLevel)*10, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      triggerRandom();

      ctx.restore();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [isDark]);

  return (
    <canvas 
      ref={canvasRef} 
      // Increased opacity for dark mode visibility
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${isDark ? 'mix-blend-screen opacity-70' : 'mix-blend-multiply opacity-30'}`}
    />
  );
};

export default SpaceNetwork;
