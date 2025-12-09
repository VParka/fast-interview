import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Info } from 'lucide-react';

export type FeedbackType = 'excellent' | 'good' | 'needs-work';

interface FeedbackChip {
  label: string;
  value: string;
  type: FeedbackType;
}

interface RealTimeFeedbackProps {
  chips: FeedbackChip[];
}

export function RealTimeFeedback({ chips }: RealTimeFeedbackProps) {
  const getChipStyles = (type: FeedbackType) => {
    switch (type) {
      case 'excellent':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'good':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'needs-work':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    }
  };

  const getIcon = (type: FeedbackType) => {
    switch (type) {
      case 'excellent':
        return <Check className="w-3.5 h-3.5" />;
      case 'good':
        return <Info className="w-3.5 h-3.5" />;
      case 'needs-work':
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-4"
    >
      {chips.map((chip, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
            ${getChipStyles(chip.type)}
            transition-all hover:scale-105
          `}
        >
          {getIcon(chip.type)}
          <span>{chip.label}:</span>
          <span className="font-semibold">{chip.value}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
