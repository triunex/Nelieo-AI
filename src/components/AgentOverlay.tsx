/**
 * AI Agent Overlay
 * Shows real-time agent activity, thinking process, and status
 * Beautiful modern UI that displays what the agent is doing
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Target, CheckCircle2, XCircle, Loader2, Eye, MousePointer2, Keyboard } from 'lucide-react';

export interface AgentStatus {
  isActive: boolean;
  currentTask?: string;
  currentAction?: string;
  thinking?: string;
  planSteps?: string[];
  currentStepIndex?: number;
  confidence?: number;
  actionsCompleted?: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

interface AgentOverlayProps {
  status: AgentStatus;
  onCancel?: () => void;
}

const AgentOverlay: React.FC<AgentOverlayProps> = ({ status, onCancel }) => {
  if (!status.isActive && !status.error) return null;

  const progressPercent = status.planSteps && status.currentStepIndex !== undefined
    ? Math.round(((status.currentStepIndex + 1) / status.planSteps.length) * 100)
    : 0;

  return (
    <AnimatePresence>
      {(status.isActive || status.error) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-[9998] w-96"
        >
          {/* Main status card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-xl bg-opacity-95">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Brain className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-semibold">AI Agent Active</h3>
                    <p className="text-blue-100 text-xs">Enhanced SuperAgent</p>
                  </div>
                </div>

                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Error state */}
            {status.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{status.error}</p>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Current task */}
              {status.currentTask && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium mb-2">
                    <Target className="w-3.5 h-3.5" />
                    <span>CURRENT TASK</span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {status.currentTask}
                  </p>
                </div>
              )}

              {/* Thinking process */}
              {status.thinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800"
                >
                  <div className="flex items-start gap-2">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    </motion.div>
                    <div>
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                        Agent thinking...
                      </p>
                      <p className="text-sm text-indigo-900 dark:text-indigo-200">
                        {status.thinking}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Current action */}
              {status.currentAction && (
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  >
                    {status.currentAction.toLowerCase().includes('click') && (
                      <MousePointer2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                    {status.currentAction.toLowerCase().includes('type') && (
                      <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                    {status.currentAction.toLowerCase().includes('observ') && (
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                    {!status.currentAction.toLowerCase().match(/click|type|observ/) && (
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                      Now doing
                    </p>
                    <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                      {status.currentAction}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan steps */}
              {status.planSteps && status.planSteps.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>STRATEGIC PLAN</span>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Steps list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {status.planSteps.map((step, index) => {
                      const isCurrent = index === status.currentStepIndex;
                      const isCompleted = status.currentStepIndex !== undefined && index < status.currentStepIndex;
                      const isPending = status.currentStepIndex !== undefined && index > status.currentStepIndex;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${isCurrent
                              ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                              : isCompleted
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-gray-50 dark:bg-gray-800/50'
                            }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                            {isCurrent && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              >
                                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </motion.div>
                            )}
                            {isPending && (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                            )}
                          </div>
                          <p className={`text-sm ${isCurrent
                              ? 'text-blue-900 dark:text-blue-100 font-medium'
                              : isCompleted
                                ? 'text-green-900 dark:text-green-100 line-through opacity-75'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                            {step}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                {status.actionsCompleted !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {status.actionsCompleted}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Actions
                    </p>
                  </div>
                )}

                {status.confidence !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(status.confidence * 100)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Confidence
                    </p>
                  </div>
                )}

                {status.estimatedTimeRemaining !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(status.estimatedTimeRemaining)}s
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Remaining
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-xl rounded-2xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentOverlay;
