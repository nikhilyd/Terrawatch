"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface ParallaxContainerProps {
  children: ReactNode;
}

export function ParallaxContainer({ children }: ParallaxContainerProps) {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Transform normalized mouse positions to pixel offsets
  const xOffset = useTransform(mouseX, [-1, 1], [15, -15]);
  const yOffset = useTransform(mouseY, [-1, 1], [15, -15]);

  if (!mounted) return <>{children}</>;

  return (
    <motion.div
      style={{
        x: xOffset,
        y: yOffset,
      }}
      className="w-full h-full relative"
    >
      {children}
    </motion.div>
  );
}
