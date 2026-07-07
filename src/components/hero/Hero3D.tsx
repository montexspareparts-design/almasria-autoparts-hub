import { Suspense, useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

/**
 * Hero3D — premium product-page 3D experience.
 *
 * Inspired by Porsche.com, Rimac, Rivian, and Apple product pages:
 *   - Real studio HDRI lighting via drei <Environment preset="studio">
 *   - Metallic brake-disc hero with drilled vent holes (instanced ring)
 *   - Red-anodized caliper ring with brand glow
 *   - Orbiting spark-plug and piston as supporting cast
 *   - Mouse parallax + scroll-linked rotation
 *   - Contact shadows for grounded realism
 *   - Reduced-motion + mobile guardrails (pauses auto-rotate, disables DPR>1)
 *
 * Note: react-three-fiber v8 (pinned) + drei v9 → React 18 compatible.
 */

// ── Brake disc with drilled cooling holes ────────────────────────────────
const BrakeDisc = ({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) => {
  const group = useRef<THREE.Group>(null!);
  const scrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((_, dt) => {
    if (!group.current) return;
    // Continuous slow spin + scroll influence
    group.current.rotation.z += dt * 0.25;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      pointer.current.x * 0.35 + scrollY.current * 0.0015,
      0.08
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -0.35 + pointer.current.y * 0.15,
      0.08
    );
  });

  // Drilled cooling holes positioned in two rings
  const holes = useMemo(() => {
    const arr: [number, number, number][] = [];
    const ring = (radius: number, count: number, offset = 0) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + offset;
        arr.push([Math.cos(a) * radius, Math.sin(a) * radius, 0]);
      }
    };
    ring(1.15, 18, 0);
    ring(0.85, 12, Math.PI / 12);
    return arr;
  }, []);

  return (
    <group ref={group}>
      {/* Main disc body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.12, 96]} />
        <meshStandardMaterial
          color="#8a8f96"
          metalness={1}
          roughness={0.28}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Inner hub (raised center) */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.18, 48]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.9} roughness={0.35} />
      </mesh>

      {/* Center bolt pattern (5 lug nuts) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.28, 0.17, Math.sin(a) * 0.28]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
            <meshStandardMaterial color="#1a1c20" metalness={1} roughness={0.4} />
          </mesh>
        );
      })}

      {/* Drilled cooling holes — punch through with dark cylinders */}
      {holes.map((p, i) => (
        <mesh key={i} position={[p[0], 0, p[2]]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 16]} />
          <meshStandardMaterial color="#050505" metalness={0.6} roughness={0.9} />
        </mesh>
      ))}

      {/* Outer edge groove */}
      <mesh>
        <torusGeometry args={[1.48, 0.02, 12, 96]} />
        <meshStandardMaterial color="#1a1c20" metalness={1} roughness={0.3} />
      </mesh>

      {/* RED anodized caliper arc — brand accent */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.62, 0.11, 20, 64, Math.PI * 0.55]} />
        <meshStandardMaterial
          color="#c9151d"
          metalness={0.85}
          roughness={0.22}
          emissive="#8a0d11"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
};

// ── Orbiting supporting parts ────────────────────────────────────────────
const OrbitingPart = ({
  radius,
  speed,
  offset,
  children,
}: {
  radius: number;
  speed: number;
  offset: number;
  children: React.ReactNode;
}) => {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius * 0.4;
    ref.current.position.y = Math.sin(t * 1.3) * 0.15;
    ref.current.rotation.y = t * 1.5;
  });
  return <group ref={ref}>{children}</group>;
};

const SparkPlug = () => (
  <group scale={0.35}>
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.4, 1.4, 24]} />
      <meshStandardMaterial color="#e8dccb" metalness={0.1} roughness={0.55} />
    </mesh>
    <mesh position={[0, 0.9, 0]} castShadow>
      <cylinderGeometry args={[0.28, 0.28, 0.5, 16]} />
      <meshStandardMaterial color="#c9a84c" metalness={1} roughness={0.25} />
    </mesh>
    <mesh position={[0, -0.85, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.22, 0.35, 16]} />
      <meshStandardMaterial color="#b8b8bd" metalness={1} roughness={0.28} />
    </mesh>
  </group>
);

const Piston = () => (
  <group scale={0.4}>
    <mesh castShadow>
      <cylinderGeometry args={[0.55, 0.55, 0.85, 32]} />
      <meshStandardMaterial color="#a8acb2" metalness={1} roughness={0.32} />
    </mesh>
    {/* Piston rings */}
    {[0.25, 0.05, -0.15].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <torusGeometry args={[0.56, 0.02, 8, 32]} />
        <meshStandardMaterial color="#2a2d33" metalness={1} roughness={0.4} />
      </mesh>
    ))}
  </group>
);

// ── Main scene ───────────────────────────────────────────────────────────
const Scene = () => {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.4, 4.2]} fov={38} />

      {/* Base lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Red rim light — brand accent */}
      <pointLight position={[-3, 1.5, 2]} intensity={2.5} color="#e11d1d" distance={8} />
      {/* Gold key light */}
      <pointLight position={[3, -1, 2.5]} intensity={1.2} color="#f5c256" distance={7} />

      {/* Studio HDRI reflections */}
      <Environment preset="studio" />

      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.55}>
        <BrakeDisc pointer={pointer} />
        <OrbitingPart radius={2.4} speed={0.4} offset={0}>
          <SparkPlug />
        </OrbitingPart>
        <OrbitingPart radius={2.4} speed={0.4} offset={Math.PI}>
          <Piston />
        </OrbitingPart>
      </Float>

      <ContactShadows
        position={[0, -1.6, 0]}
        opacity={0.55}
        scale={7}
        blur={2.4}
        far={3}
        color="#000000"
      />
    </>
  );
};

// ── Public component with mobile / reduced-motion guardrails ─────────────
const Hero3D = ({ fallback }: { fallback?: React.ReactNode }) => {
  const [enabled, setEnabled] = useState(true);
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    // Extremely small screens or low core count → skip WebGL, use fallback
    const lowEnd = isMobile && (navigator.hardwareConcurrency ?? 4) <= 4;
    if (reduced || lowEnd) setEnabled(false);
    setDpr(isMobile ? [1, 1] : [1, 1.5]);
  }, []);

  if (!enabled && fallback) return <>{fallback}</>;

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
