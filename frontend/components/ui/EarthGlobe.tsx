"use client";

import React, { useRef, Suspense, useState, Component, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// ── Atmosphere rim-glow shaders ───────────────────────────────────────────────
const ATMOS_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOS_FRAG = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.5);
    // Blue green rim glow matching EcoWatch theme
    gl_FragColor = vec4(0.06, 0.72, 0.50, 1.0) * intensity;
  }
`;

// ── Inner atmosphere (tight blue rim) ────────────────────────────────────────
function AtmosphereRim() {
  return (
    <mesh>
      <sphereGeometry args={[1.62, 64, 64]} />
      <shaderMaterial
        vertexShader={ATMOS_VERT}
        fragmentShader={ATMOS_FRAG}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Outer soft halo ───────────────────────────────────────────────────────────
function AtmosphereHalo() {
  return (
    <mesh>
      <sphereGeometry args={[1.9, 32, 32]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.04}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Orbiting Data Rings ──────────────────────────────────────────────────────
function OrbitingRings({ isHovered }: { isHovered: boolean }) {
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (ringsRef.current && !isHovered) {
      ringsRef.current.rotation.x += delta * 0.12;
      ringsRef.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <group ref={ringsRef}>
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.8, 0.004, 16, 100]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 3, Math.PI / 6, 0]}>
        <torusGeometry args={[2.1, 0.003, 16, 100]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ── Floating Satellites / Data Nodes ─────────────────────────────────────────
function OrbitingNodes({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const nodes = useRef([...Array(6)].map(() => ({
    angle: Math.random() * Math.PI * 2,
    radius: 2.2 + Math.random() * 0.5,
    speed: 0.2 + Math.random() * 0.3,
    yOffset: (Math.random() - 0.5) * 1.5,
  })));

  useFrame((state, delta) => {
    if (groupRef.current && !isHovered) {
      groupRef.current.rotation.y -= delta * 0.15;
      groupRef.current.rotation.z += delta * 0.05;

      // Individual node pulsing rotation
      groupRef.current.children.forEach((child, i) => {
        child.rotation.x += delta * nodes.current[i].speed;
        child.rotation.y += delta * nodes.current[i].speed;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.current.map((node, i) => {
        const x = Math.cos(node.angle) * node.radius;
        const z = Math.sin(node.angle) * node.radius;
        return (
          <mesh key={i} position={[x, node.yOffset, z]}>
            <octahedronGeometry args={[0.035, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Structured 3D Globe ──────────────────────────────────────────────────────
function StructuredGlobe({
  mouse,
  scrollProgress,
  isHovered,
}: {
  mouse: { x: number; y: number };
  scrollProgress: number;
  isHovered: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationY = useRef(0);

  // Generate highly subdivided icosahedron for structural feel
  const [geometry, positions] = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.5, 16);
    const pos = geo.attributes.position.array as Float32Array;
    return [geo, pos];
  }, []);

  useFrame((state, delta) => {
    const speed = 0.045 + scrollProgress * 0.05;

    // Only rotate when not hovered
    if (!isHovered) {
      rotationY.current += delta * speed;
    }

    if (groupRef.current) {
      // Smooth interactive scaling on hover
      const targetScale = isHovered ? 1.06 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

      groupRef.current.rotation.y = rotationY.current;
      groupRef.current.rotation.x +=
        (mouse.y * 0.28 - groupRef.current.rotation.x) * 0.035;
      groupRef.current.rotation.z +=
        (-mouse.x * 0.12 - groupRef.current.rotation.z) * 0.035;
    }
  });

  return (
    <group ref={groupRef} position={[0.95, 0, 0]}>
      {/* Inner core to hide back faces */}
      <mesh>
        <sphereGeometry args={[1.48, 64, 64]} />
        <meshBasicMaterial color="#020610" />
      </mesh>

      {/* Cybernetic Wireframe */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#3b82f6"
          wireframe
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Data Nodes at vertices */}
      <Points positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#06b6d4"
          size={0.018}
          sizeAttenuation
          depthWrite={false}
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      <OrbitingRings isHovered={isHovered} />
      <OrbitingNodes isHovered={isHovered} />

      <AtmosphereRim />
      <AtmosphereHalo />
    </group>
  );
}

// ── Stylized fallback (shown while textures load) ─────────────────────────────
function EarthFallback({ mouse }: { mouse: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (meshRef.current)
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.045;
    if (groupRef.current) {
      groupRef.current.rotation.x +=
        (mouse.y * 0.28 - groupRef.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhongMaterial
          color="#0a2a55"
          emissive="#061428"
          emissiveIntensity={0.8}
          specular="#1a4488"
          shininess={25}
        />
      </mesh>
      <AtmosphereRim />
      <AtmosphereHalo />
    </group>
  );
}

// ── Scroll-responsive camera ──────────────────────────────────────────────────
function ScrollCamera({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Smooth zoom-out: z 3.4 → 5.0 as user scrolls
    const targetZ = 3.4 + scrollProgress * 1.6;
    const targetY = scrollProgress * 0.25;
    camera.position.z += (targetZ - camera.position.z) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
  });

  return null;
}

// ── Full scene ────────────────────────────────────────────────────────────────
function EarthScene({
  mouse,
  scrollProgress,
  isHovered,
}: {
  mouse: { x: number; y: number };
  scrollProgress: number;
  isHovered: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#010612"]} />
      <Stars radius={120} depth={80} count={5000} factor={4} saturation={0} fade speed={0.4} />

      {/* Lighting for stars/atmosphere (Globe uses BasicMaterials) */}
      <ambientLight intensity={0.5} />

      <ScrollCamera scrollProgress={scrollProgress} />

      <Suspense fallback={<EarthFallback mouse={mouse} />}>
        <StructuredGlobe mouse={mouse} scrollProgress={scrollProgress} isHovered={isHovered} />
      </Suspense>
    </>
  );
}

// ── Error boundary (catches texture or WebGL failures) ───────────────────────
interface EBState { hasError: boolean }
class GlobeErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  EBState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ── Public export ─────────────────────────────────────────────────────────────
export function EarthGlobe({
  className,
  scrollProgress = 0,
}: {
  className?: string;
  scrollProgress?: number;
}) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    });
  };

  // Fallback shown if WebGL or texture loading completely fails
  const errorFallback = (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "#010612" }}
    >
      <div
        className="rounded-full border border-blue-500/20"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle at 35% 35%, #0d3460, #010612)",
          boxShadow: "0 0 80px rgba(59, 130, 246,0.15)",
        }}
      />
    </div>
  );

  return (
    <GlobeErrorBoundary fallback={errorFallback}>
      <div
        className={className}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setMouse({ x: 0, y: 0 });
          setIsHovered(false);
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 3.4], fov: 48 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          dpr={[1, 3]}
        >
          <EarthScene mouse={mouse} scrollProgress={scrollProgress} isHovered={isHovered} />
        </Canvas>
      </div>
    </GlobeErrorBoundary>
  );
}
