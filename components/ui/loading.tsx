import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  key?: React.Key;
  className?: string;
  fullPage?: boolean;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ 
  className, 
  fullPage = false, 
  text = 'Loading...', 
  size = 'md' 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-4",
    fullPage ? "fixed inset-0 bg-[#fdfbf7]/80 backdrop-blur-sm z-50" : "w-full h-full py-12",
    className
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={containerClasses}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className={cn("text-[#d97757]", sizeClasses[size])} />
        </motion.div>
        
        {/* Subtle pulsing background glow */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 bg-[#d97757] rounded-full blur-xl -z-10",
            sizeClasses[size]
          )}
        />
      </div>
      
      {text && (
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[#6b665e] font-medium text-sm tracking-wide"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}
