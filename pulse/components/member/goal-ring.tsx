"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Segmented weekly-goal ring: one arc per target class, filled as classes
 * are attended. Reads as "2 of 3" at a glance and never shows a percentage —
 * the goal is a count of classes, nothing more.
 */
export function GoalRing({
  done,
  target,
  size = 96,
  stroke = 9,
  className,
  children,
}: {
  done: number;
  target: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const segments = Math.max(1, Math.min(5, target));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments === 1 ? 0 : stroke * 1.1;
  const seg = c / segments - gap;
  const met = done >= target;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${done}/${target}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {Array.from({ length: segments }).map((_, i) => {
          const filled = i < done;
          return (
            <g key={i}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--color-surface-3)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${seg} ${c - seg}`}
                strokeDashoffset={-(i * (seg + gap))}
              />
              {filled && (
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={met ? "var(--color-volt-bright)" : "var(--color-volt)"}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${seg} ${c - seg}`}
                  strokeDashoffset={-(i * (seg + gap))}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + i * 0.12,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
