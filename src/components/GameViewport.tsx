'use client';

import type { ReactNode } from 'react';

/** Centered mobile container for the whole game.
 * Height-aware: children control centering (the card stage uses flex-1). */
export default function GameViewport({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#fdfbf7] p-4 text-[#4a3f35] shadow-xl select-none">
      {children}
    </div>
  );
}
