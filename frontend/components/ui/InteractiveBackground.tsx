"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// ── Floating Star Particle Field ─────────────────────────────────────────────
function ParticleField({ count = 2200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { mouse } = useThree();

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const white  = new THREE.Color("#ffffff");
    const cyan   = new THREE.Color("#06b6d4");
    const violet = new THREE.Color("#818cf8");

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 30;
      positions[i3 + 1] = (Math.random() - 0.5) * 30;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      const mix = Math.random();
      const c =
        mix < 0.5
          ? white.clone().lerp(cyan, mix * 2)
          : cyan.clone().lerp(violet, (mix - 0.5) * 2);
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }
    return [positions, colors];
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    pointsRef.current.rotation.x = t * 0.018 + mouse.y * 0.06;
    pointsRef.current.rotation.y = t * 0.022 + mouse.x * 0.06;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.028}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={0.1} />
      <ParticleField count={2200} />
    </>
  );
}

// ── Global Background (fixed, under all content) ──────────────────────────────
export function InteractiveBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.2]}
      >
        <Scene />
      </Canvas>

      {/* Radial vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(3,7,18,0.8) 100%)",
        }}
      />
    </div>
  );
}
