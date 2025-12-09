import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface Tip {
  text: string;
  type: 'structure' | 'detail' | 'time';
}

interface GuidancePanelProps {
  tips: Tip[];
  show?: boolean;
}

export function GuidancePanel({ tips, show = true }: GuidancePanelProps) {
  if (!show || tips.length === 0) return null;

  const getIcon = (type: Tip['type']) => {
    return <Lightbulb className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            답변 가이드
          </span>
        </div>
        
        <ul className="space-y-1.5">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
              <span className="text-yellow-600 dark:text-yellow-500 mt-0.5">•</span>
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
