import React from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
  timeElapsed?: number;
}

export function VoiceVisualizer({ audioLevel, isRecording, timeElapsed = 0 }: VoiceVisualizerProps) {
  const bars = 40; // Number of bars in waveform
  
  // Generate random heights for visual effect
  const barHeights = Array.from({ length: bars }, (_, i) => {
    if (!isRecording) return 10;
    
    // Create wave pattern
    const wavePosition = (i / bars) * Math.PI * 2 + (timeElapsed / 1000);
    const baseHeight = Math.sin(wavePosition) * 30 + 40;
    const audioBoost = audioLevel * 60;
    
    return Math.max(10, Math.min(100, baseHeight + audioBoost));
  });

  return (
    <div className="flex items-center justify-center gap-[2px] h-24 w-full px-4">
      {barHeights.map((height, index) => (
        <motion.div
          key={index}
          className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-full"
          initial={{ height: 10 }}
          animate={{ 
            height: `${height}%`,
            opacity: isRecording ? 1 : 0.3,
          }}
          transition={{
            duration: 0.1,
            ease: 'easeOut',
          }}
          style={{
            maxWidth: '4px',
          }}
        />
      ))}
    </div>
  );
}
