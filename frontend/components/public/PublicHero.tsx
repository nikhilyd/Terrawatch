"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function AbstractEarth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]}>
        <MeshDistortMaterial 
          color="#06b6d4" 
          attach="material" 
          distort={0.3} 
          speed={1.5} 
          roughness={0.2}
          metalness={0.8}
          wireframe={true}
          transparent
          opacity={0.3}
        />
      </Sphere>
      {/* Inner solid core */}
      <Sphere args={[1.2, 32, 32]}>
        <meshStandardMaterial color="#020617" roughness={0.9} />
      </Sphere>
    </Float>
  );
}

export function PublicHero() {
  return (
    <div className="w-full h-[100vh] absolute top-0 left-0 -z-10 pointer-events-none opacity-60">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#3b82f6" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#06b6d4" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <AbstractEarth />
      </Canvas>
      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#020617] to-transparent" />
    </div>
  );
}
