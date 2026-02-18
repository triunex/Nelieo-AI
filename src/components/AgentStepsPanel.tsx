import React from "react";
import { AnimatePresence, motion } from "framer-motion";

// Reuse the AgentStatus shape used across the app
export type AgentStatus = {
  isActive: boolean;
  currentTask?: string;
  currentAction?: string;
  thinking?: string;
  planSteps?: string[];
  currentStepIndex?: number;
  confidence?: number;
  actionsCompleted?: number;
  error?: string;
};

interface Props {
  status: AgentStatus;
}

/**
 * Beautiful glassy side panel showing the Agent's live plan steps.
 * - Highlights current step
 * - Shows next step preview
 * - Animates in/out and between steps
 * - Hides when agent not active and no steps
 */
export default function AgentStepsPanel({ status }: Props) {
  const steps = (status.planSteps || []).filter(Boolean);
  const current = Math.max(0, status.currentStepIndex ?? 0);
  const hasSteps = steps.length > 0;
  const isActive = !!status.isActive;

  // Derive next step safely
  const nextStep = hasSteps && current + 1 < steps.length ? steps[current + 1] : undefined;
  const currentStep = hasSteps ? steps[Math.min(current, steps.length - 1)] : status.currentAction;

  const progressPct = hasSteps ? Math.min(100, Math.round(((current) / Math.max(1, steps.length)) * 100)) : 0;

  // CRITICAL: Only show panel when agent is ACTIVELY running a task
  // Don't show if user just opened apps manually without running a command
  if (!isActive) return null;
  if (!hasSteps && !status.currentAction && !status.thinking) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed right-4 top-24 w-[300px] max-w-[calc(100vw-2rem)] select-none"
      >
        {/* Header row (free-form, no box) */}
        <div className="flex items-center justify-between pr-2">
          <h3 className="text-[12px] font-semibold tracking-wide uppercase text-white/70">Agent plan</h3>
          {hasSteps ? (
            <span className="text-[11px] text-white/50">{current + 1}/{steps.length}</span>
          ) : (
            <span className="text-[11px] text-white/50">preparing…</span>
          )}
        </div>

        {/* Progress line (free) */}
        <div className="mt-1 h-[2px] w-full bg-white/10">
          <div
            className="h-[2px] bg-emerald-400/80 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Current / Next inline text */}
        <div className="mt-2 pr-3 space-y-1">
          <div className="text-[12px] text-white/85 break-words">
            <span className="font-medium text-white">Now:</span> {currentStep || status.thinking || "Planning…"}
          </div>
          {nextStep && (
            <div className="text-[12px] text-white/60 break-words">
              <span className="font-medium text-white/70">Next:</span> {nextStep}
            </div>
          )}
        </div>

        {/* Steps list (free-form, no container) */}
        {hasSteps && (
          <ol className="relative mt-3 ml-4 pr-3 max-h-[46vh] overflow-y-auto">
            {/* subtle vertical rail */}
            <div className="absolute left-[-10px] top-1 bottom-1 w-px bg-white/12" />
            {steps.map((step, idx) => {
              const state = idx < current ? "done" : idx === current ? "active" : "todo";
              return (
                <li key={idx} className="mb-1.5 last:mb-0">
                  <div className="relative flex items-start gap-2">
                    {/* state dot */}
                    <span
                      className={[
                        "mt-1 h-2 w-2 rounded-full",
                        state === "done" && "bg-emerald-400/90",
                        state === "active" && "bg-white animate-pulse",
                        state === "todo" && "bg-white/30",
                      ].filter(Boolean).join(" ")}
                    />
                    {/* text pill only for active, otherwise plain text */}
                    {state === "active" ? (
                      <span className="text-[12px] leading-5 text-white bg-white/10 border border-white/15 backdrop-blur-md rounded-full px-3 py-0.5 break-words">
                        {step}
                      </span>
                    ) : (
                      <span className={[
                        "text-[12px] leading-5 break-words",
                        state === "done" ? "text-white/55 line-through" : "text-white/75",
                      ].join(" ")}>{step}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
