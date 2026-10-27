"use client";

export function CompassLoader({ size = 48 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center">
      <img
        src="/logo.svg"
        alt="Клинический Компас"
        className="animate-spin"
        style={{ width: size, height: size, animationDuration: "2.8s" }}
      />
    </div>
  );
}