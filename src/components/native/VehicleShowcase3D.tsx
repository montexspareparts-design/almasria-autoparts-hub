import { useEffect, useRef, useState } from "react";
import hiaceImg from "@/assets/vehicles/toyota-hiace.png";

/**
 * Precision Dark — 3D vehicle showcase.
 * Renders the active garage vehicle as a floating, studio-lit 3D model:
 * perspective tilt, device-motion parallax, contact shadow and a red
 * light pool underneath. Purely presentational.
 */

const MODEL_IMAGES: Record<string, string> = {
  hiace: hiaceImg,
};

export const hasVehicleRender = (modelKey?: string | null) =>
  !!modelKey && !!MODEL_IMAGES[modelKey];

const VehicleShowcase3D = ({ modelKey, label }: { modelKey: string; label: string }) => {
  const src = MODEL_IMAGES[modelKey];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // gentle parallax from device orientation (no-op on desktop)
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-24, Math.min(24, e.gamma ?? 0));
      const beta = Math.max(-16, Math.min(16, (e.beta ?? 0) - 45));
      setTilt({ x: -beta * 0.18, y: gamma * 0.4 });
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  if (!src) return null;

  return (
    <div ref={ref} className="v3d" aria-hidden={false}>
      {/* light pool */}
      <span className="v3d-pool" />
      {/* stage grid */}
      <span className="v3d-grid" />

      <div
        className="v3d-stage"
        style={{ transform: `rotateX(${8 + tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <img
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          className="v3d-car"
          draggable={false}
        />
        <img src={src} alt="" aria-hidden className="v3d-reflection" draggable={false} />
        <span className="v3d-shadow" />
      </div>
    </div>
  );
};

export default VehicleShowcase3D;
