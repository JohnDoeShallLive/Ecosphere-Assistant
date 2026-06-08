"use client";

import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

export function TitleBar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  const handleMinimize = () => window.electron.windowControls.minimize();
  const handleMaximize = () => window.electron.windowControls.maximize();
  const handleClose = () => window.electron.windowControls.close();

  return (
    <div 
      className="h-10 w-full flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-white/5 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center px-4 gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-white/40" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
          Ecosphere
        </span>
      </div>

      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize}
          className="w-12 h-10 flex items-center justify-center text-[#666] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={handleMaximize}
          className="w-12 h-10 flex items-center justify-center text-[#666] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={handleClose}
          className="w-12 h-10 flex items-center justify-center text-[#666] hover:bg-red-500/80 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
