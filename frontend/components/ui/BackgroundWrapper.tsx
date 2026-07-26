"use client";
import dynamic from "next/dynamic";

const InteractiveBackground = dynamic(
  () =>
    import("@/components/ui/InteractiveBackground").then(
      (m) => m.InteractiveBackground
    ),
  { ssr: false }
);

export function BackgroundWrapper() {
  return <InteractiveBackground />;
}
