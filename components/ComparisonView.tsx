import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface ComparisonViewProps {
  originalSrc: string;
  processedSrc: string;
  onReset: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ originalSrc, processedSrc, onReset }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(containerRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    
    setSliderPosition(percent);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = processedSrc;
    link.download = `nanocleanse_output_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto px-4 mt-8 pb-12">
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <span className="bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium border border-yellow-400/20">
              Processed Successfully
            </span>
          </div>
          <div className="flex space-x-3">
             <button 
              onClick={onReset}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw size={16} />
              New Image
            </button>
            <button 
              onClick={handleDownload}
              className="bg-white text-slate-900 px-6 py-2 rounded-xl font-semibold text-sm hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-lg shadow-white/5"
            >
              <Download size={16} />
              Download Result
            </button>
          </div>
        </div>

        <div 
          ref={imageRef}
          className="relative w-full aspect-auto min-h-[400px] select-none rounded-2xl overflow-hidden cursor-col-resize touch-none ring-1 ring-slate-700"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Background Image (Original - Shown on Right side of slider) */}
          <img 
            src={originalSrc} 
            alt="Original" 
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" 
          />
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white px-2 py-1 rounded text-xs">Original</div>

          {/* Foreground Image (Processed - Clipped by slider) */}
          <div 
            className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none border-r-2 border-yellow-400 bg-slate-900"
            style={{ width: `${sliderPosition}%` }}
          >
            <img 
              src={processedSrc} 
              alt="Processed" 
              className="absolute top-0 left-0 h-full max-w-none object-contain"
              style={{ width: imageRef.current ? `${imageRef.current.offsetWidth}px` : '100%' }}
             />
             <div className="absolute top-4 left-4 bg-yellow-400/90 text-slate-900 font-bold px-2 py-1 rounded text-xs shadow-lg">Clean</div>
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center justify-center z-20 pointer-events-none"
            style={{ left: `calc(${sliderPosition}% - 16px)` }}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-slate-900 rounded-full"></div>
              <div className="w-0.5 h-3 bg-slate-900 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
           <AlertCircle size={14} /> Drag the slider to compare before and after
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;