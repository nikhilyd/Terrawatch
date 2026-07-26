"use client";

import { motion } from "framer-motion";

export function FieldBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#020617]">
      
      {/* Topographic Lines Background (SVG Pattern) */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c13.866 0 25.366 11.2 26 25 2.266 0 4-1.734 4-4s-1.734-4-4-4c-13.866 0-25.366-11.2-26-25C4.266 10 2.5 11.734 2.5 14s1.734 4 4 4c13.866 0 25.366 11.2 26 25 2.266 0 4-1.734 4-4s-1.734-4-4-4zM55 58c13.866 0 25.366 11.2 26 25 2.266 0 4-1.734 4-4s-1.734-4-4-4c-13.866 0-25.366-11.2-26-25 2.266 0 4-1.734 4-4s-1.734-4-4-4c13.866 0 25.366 11.2 26 25 2.266 0 4-1.734 4-4s-1.734-4-4-4z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px'
        }}
      />

      {/* Radar Sweep Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] opacity-10">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="w-full h-full rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 70%, rgba(59, 130, 246, 0.4) 100%)',
          }}
        />
        {/* Radar Center Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59, 130, 246,1)]" />
      </div>

      {/* Pulsing Radar Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px]">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeOut",
              delay: i * 1.3
            }}
            className="absolute inset-0 border border-blue-500 rounded-full m-auto"
            style={{ width: '100%', height: '100%' }}
          />
        ))}
      </div>

      {/* Grid Lines for GPS aesthetic */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-blue-500/10 -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-blue-500/10 -translate-x-1/2" />
      
    </div>
  );
}
