import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterviewerAvatarProps {
  name: string;
  role: string;
  emoji: string;
  isActive: boolean;
  isListening?: boolean;
  isThinking?: boolean;
}

export function InterviewerAvatar({
  name,
  role,
  emoji,
  isActive,
  isListening = false,
  isThinking = false,
}: InterviewerAvatarProps) {
  const [currentEmoji, setCurrentEmoji] = useState(emoji);

  useEffect(() => {
    if (isThinking) {
      const interval = setInterval(() => {
        setCurrentEmoji((prev) => (prev === '🤔' ? emoji : '🤔'));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentEmoji(emoji);
    }
  }, [isThinking, emoji]);

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: isActive ? 1 : 0.6,
      }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        ${isActive ? 'bg-primary/10 ring-2 ring-primary/50' : 'bg-secondary/30'}
      `}
    >
      {/* Avatar with breathing animation */}
      <div className="relative">
        <motion.div
          animate={isListening ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl"
        >
          {currentEmoji}
        </motion.div>
        
        {/* Status indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background"
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-full h-full rounded-full bg-green-400"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{role}</p>
      </div>
      
      {/* Thinking animation */}
      {isThinking && (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
