import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface ContextReferenceCardProps {
  previousAnswer: string;
  keywords?: string[];
  onExpand?: () => void;
  expanded?: boolean;
}

export function ContextReferenceCard({
  previousAnswer,
  keywords = [],
  onExpand,
  expanded = false,
}: ContextReferenceCardProps) {
  const preview = previousAnswer.slice(0, 100) + (previousAnswer.length > 100 ? '...' : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-border transition-colors">
        <div className="flex-shrink-0 mt-1">
          <div className="w-1 h-full bg-primary/50 rounded-full" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              이전 답변 참조
            </span>
          </div>
          
          <p className="text-sm text-foreground/80 leading-relaxed">
            {expanded ? previousAnswer : preview}
          </p>
          
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
          
          {previousAnswer.length > 100 && (
            <button
              onClick={onExpand}
              className="mt-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {expanded ? '접기' : '전체 보기'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
