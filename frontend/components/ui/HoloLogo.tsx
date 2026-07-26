"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function AnimatedGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.2}>
      <MeshDistortMaterial
        color="#3b82f6"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.2}
        metalness={0.8}
        wireframe={true}
      />
    </Sphere>
  );
}

export function HoloLogo() {
  return (
    <div className="h-10 w-10 relative">
      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md" />
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[2, 2, 2]} intensity={2} color="#06b6d4" />
        <AnimatedGlobe />
      </Canvas>
    </div>
  );
}
