"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  HTMLAttributes,
} from "react";
import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";

/* -------------------------------------------------------------------------- */
/*                                   PLUS ICON                                */
/* -------------------------------------------------------------------------- */

interface PlusIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const PlusIcon = forwardRef<HTMLDivElement, PlusIconProps>(
  ({ className, size = 24, ...props }, ref) => {
    const controls = useAnimation();

    return (
      <div
        ref={ref}
        className={className}
        onMouseEnter={() => controls.start({ rotate: 180 })}
        onMouseLeave={() => controls.start({ rotate: 0 })}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={controls}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </motion.svg>
      </div>
    );
  }
);

PlusIcon.displayName = "PlusIcon";

/* -------------------------------------------------------------------------- */
/*                                  LOGOUT ICON                               */
/* -------------------------------------------------------------------------- */

export interface LogoutIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LogoutIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const PATH_VARIANTS: Variants = {
  normal: {
    x: 0,
    translateX: 0,
  },
  animate: {
    x: 2,
    translateX: [0, -3, 0],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export const LogoutIcon = forwardRef<LogoutIconHandle, LogoutIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("animate");
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("normal");
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("inline-flex items-center justify-center", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

          <motion.polyline
            points="16 17 21 12 16 7"
            variants={PATH_VARIANTS}
            initial="normal"
            animate={controls}
          />

          <motion.line
            x1="21"
            x2="9"
            y1="12"
            y2="12"
            variants={PATH_VARIANTS}
            initial="normal"
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

LogoutIcon.displayName = "LogoutIcon";
