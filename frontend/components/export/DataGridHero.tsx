"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function AnimatedGrid() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 1;
      gridRef.current.rotation.x = Math.PI / 2.5 + Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
      gridRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <group ref={gridRef}>
      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={1}
        cellColor="#06b6d4"
        sectionSize={2.5}
        sectionThickness={1.5}
        sectionColor="#3b82f6"
        fadeDistance={25}
        fadeStrength={1}
      />
    </group>
  );
}

export function DataGridHero() {
  return (
    <Canvas camera={{ position: [0, 1, 5], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#06b6d4" />
      <fog attach="fog" args={["#020617", 5, 15]} />
      
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
        <AnimatedGrid />
      </Float>
    </Canvas>
  );
}
