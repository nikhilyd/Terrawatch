import Image from "next/image";

export function HoloLogo() {
  return (
    <div className="h-10 w-10 relative flex items-center justify-center">
      <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-md" />
      <div className="relative h-9 w-9 rounded-full overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.5)]">
        <Image 
          src="/earth.jpg" 
          alt="EcoWatch Earth" 
          fill 
          className="object-cover"
        />
      </div>
    </div>
  );
}
