"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/ease";

/**
 * Shared empty / unavailable state. Motion entrance is from beUI's Motion stack;
 * no fabricated data — just a clear placeholder for later features.
 */
export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-default text-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {description ? <span className="max-w-sm text-sm text-muted">{description}</span> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </motion.div>
  );
}
