/**
 * AI Agent Cursor Component
 * Beautiful animated cursor that shows what the AI agent is doing
 * Similar to the sky-blue dot in the reference screenshots
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MousePointer2, Keyboard, Eye, CheckCircle2, XCircle, Zap } from 'lucide-react';

export interface AgentCursorPosition {
  x: number;
  y: number;
  action?: 'click' | 'type' | 'wait' | 'observe' | 'success' | 'error' | 'thinking';
  text?: string; // What the agent is doing
  visible?: boolean;
}

interface AgentCursorProps {
  position: AgentCursorPosition;
  scale?: number; // Scale factor for iframe display
}

const AgentCursor: React.FC<AgentCursorProps> = ({ position, scale = 1 }) => {
  const [ripples, setRipples] = useState<number[]>([]);
  
  // Create ripple effect on position change
  useEffect(() => {
    if (position.action === 'click') {
      const id = Date.now();
      setRipples(prev => [...prev, id]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r !== id));
      }, 1000);
    }
  }, [position.x, position.y, position.action]);

  if (!position.visible) return null;

  const getActionColor = () => {
    switch (position.action) {
      case 'click': return 'bg-blue-500';
      case 'type': return 'bg-purple-500';
      case 'wait': return 'bg-yellow-500';
      case 'observe': return 'bg-cyan-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'thinking': return 'bg-indigo-500';
      default: return 'bg-sky-400'; // Default sky blue like in screenshots
    }
  };

  const getActionIcon = () => {
    const className = "w-3 h-3 text-white";
    switch (position.action) {
      case 'click': return <MousePointer2 className={className} />;
      case 'type': return <Keyboard className={className} />;
      case 'wait': return <Loader2 className={`${className} animate-spin`} />;
      case 'observe': return <Eye className={className} />;
      case 'success': return <CheckCircle2 className={className} />;
      case 'error': return <XCircle className={className} />;
      case 'thinking': return <Zap className={className} />;
      default: return null;
    }
  };

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${position.x * scale}px`,
        top: `${position.y * scale}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Main cursor dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative w-6 h-6 rounded-full ${getActionColor()} shadow-lg flex items-center justify-center`}
      >
        {/* Pulsing glow effect */}
        <motion.div
          className={`absolute inset-0 rounded-full ${getActionColor()} opacity-40`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Action icon */}
        {getActionIcon()}
      </motion.div>

      {/* Ripple effects for clicks */}
      <AnimatePresence>
        {ripples.map((id) => (
          <motion.div
            key={id}
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              width: '24px',
              height: '24px',
              left: '-6px',
              top: '-6px',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Action label */}
      {position.text && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute left-8 top-0 whitespace-nowrap"
        >
          <div className={`px-3 py-1.5 rounded-lg ${getActionColor()} bg-opacity-95 text-white text-sm font-medium shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center gap-2">
              {position.action === 'type' && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⌨️
                </motion.span>
              )}
              {position.text}
            </div>
          </div>
          
          {/* Arrow pointing to cursor */}
          <div 
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-0 h-0 border-t-4 border-b-4 border-r-8 ${getActionColor()} border-transparent border-r-current`}
            style={{ borderRightColor: 'currentColor' }}
          />
        </motion.div>
      )}

      {/* Typing animation trail */}
      {position.action === 'type' && (
        <motion.div
          className="absolute -right-2 top-1/2 -translate-y-1/2"
          animate={{
            x: [0, 20, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="flex gap-1">
            <motion.div
              className="w-1 h-1 rounded-full bg-purple-400"
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-purple-400"
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-purple-400"
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      )}

      {/* Scanning animation for observe */}
      {position.action === 'observe' && (
        <motion.div
          className="absolute inset-0"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div className="absolute top-0 left-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent transform -translate-x-1/2" />
        </motion.div>
      )}
    </div>
  );
};

export default AgentCursor;
