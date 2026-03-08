import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: "gear" | "bolt" | "circle" | "diamond";
  rotation: number;
}

const GearSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-primary/8">
    <path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke="currentColor"
      strokeWidth="1"
    />
    <path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
      stroke="currentColor"
      strokeWidth="1"
    />
  </svg>
);

const BoltSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-primary/6">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FloatingParticles = ({ count = 12, className = "" }: { count?: number; className?: string }) => {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 16 + Math.random() * 24,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -20,
      type: (["gear", "bolt", "circle", "diamond"] as const)[i % 4],
      rotation: Math.random() * 360,
    })),
    [count]
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            rotate: [p.rotation, p.rotation + 180, p.rotation + 360],
            opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        >
          {p.type === "gear" && <GearSVG size={p.size} />}
          {p.type === "bolt" && <BoltSVG size={p.size} />}
          {p.type === "circle" && (
            <div
              className="rounded-full border border-primary/8"
              style={{ width: p.size, height: p.size }}
            />
          )}
          {p.type === "diamond" && (
            <div
              className="border border-primary/6 rotate-45"
              style={{ width: p.size * 0.7, height: p.size * 0.7 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingParticles;
