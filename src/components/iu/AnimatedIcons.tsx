"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  HTMLAttributes,
} from "react";
import type { Transition, Variants } from "motion/react";
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

const LOGOUT_PATH_VARIANTS: Variants = {
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
            variants={LOGOUT_PATH_VARIANTS}
            initial="normal"
            animate={controls}
          />

          <motion.line
            x1="21"
            x2="9"
            y1="12"
            y2="12"
            variants={LOGOUT_PATH_VARIANTS}
            initial="normal"
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

LogoutIcon.displayName = "LogoutIcon";

/* -------------------------------------------------------------------------- */
/*                                   sun ICON                                 */
/* -------------------------------------------------------------------------- */



export interface SunMediumIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SunMediumIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SUN_PATH_VARIANTS: Variants = {
  normal: { opacity: 1 },
  animate: (i: number) => ({
    opacity: [0, 1],
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

const SunMediumIcon = forwardRef<SunMediumIconHandle, SunMediumIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <circle cx="12" cy="12" r="4" />
          {[
            'M12 3v1',
            'M12 20v1',
            'M3 12h1',
            'M20 12h1',
            'm18.364 5.636-.707.707',
            'm6.343 17.657-.707.707',
            'm5.636 5.636.707.707',
            'm17.657 17.657.707.707',
          ].map((d, index) => (
            <motion.path
              key={d}
              d={d}
              animate={controls}
              variants={SUN_PATH_VARIANTS}
              custom={index + 1}
            />
          ))}
        </svg>
      </div>
    );
  }
);

SunMediumIcon.displayName = 'SunMediumIcon';

export { SunMediumIcon };

/* -------------------------------------------------------------------------- */
/*                                   SunMoonIcon                                 */
/* -------------------------------------------------------------------------- */

export interface SunMoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SunMoonIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SUN_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -5, 5, -2, 2, 0],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
    },
  },
};

const MOON_VARIANTS: Variants = {
  normal: { opacity: 1 },
  animate: (i: number) => ({
    opacity: [0, 1],
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

const SunMoonIcon = forwardRef<SunMoonIconHandle, SunMoonIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const sunControls = useAnimation();
    const moonControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          sunControls.start('animate');
          moonControls.start('animate');
        },
        stopAnimation: () => {
          sunControls.start('normal');
          moonControls.start('normal');
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          sunControls.start('animate');
          moonControls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [sunControls, moonControls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          sunControls.start('normal');
          moonControls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [sunControls, moonControls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.g
            variants={SUN_VARIANTS}
            animate={sunControls}
            initial="normal"
          >
            <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4" />
          </motion.g>
          {[
            'M12 2v2',
            'M12 20v2',
            'm4.9 4.9 1.4 1.4',
            'm17.7 17.7 1.4 1.4',
            'M2 12h2',
            'M20 12h2',
            'm6.3 17.7-1.4 1.4',
            'm19.1 4.9-1.4 1.4',
          ].map((d, index) => (
            <motion.path
              key={d}
              d={d}
              animate={moonControls}
              variants={MOON_VARIANTS}
              custom={index + 1}
              initial="normal"
            />
          ))}
        </svg>
      </div>
    );
  }
);

SunMoonIcon.displayName = 'SunMoonIcon';

export { SunMoonIcon };

/* -------------------------------------------------------------------------- */
/*                                   moon ICON                                 */
/* -------------------------------------------------------------------------- */


export interface MoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MoonIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SVG_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -10, 10, -5, 5, 0],
  },
};

const SVG_TRANSITION: Transition = {
  duration: 1.2,
  ease: 'easeInOut',
};

const MoonIcon = forwardRef<MoonIconHandle, MoonIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );
    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={SVG_VARIANTS}
          animate={controls}
          transition={SVG_TRANSITION}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </motion.svg>
      </div>
    );
  }
);

MoonIcon.displayName = 'MoonIcon';

export { MoonIcon };

/* -------------------------------------------------------------------------- */
/*                                   user icon                                 */
/* -------------------------------------------------------------------------- */

export interface UserIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const PATH_VARIANT: Variants = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
};

const CIRCLE_VARIANT: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    scale: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    scale: [0.5, 1],
  },
};

const UserIcon = forwardRef<UserIconHandle, UserIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );
    return (
      <div
        className={cn(className)}
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
          <motion.circle
            cx="12"
            cy="8"
            r="5"
            animate={controls}
            variants={CIRCLE_VARIANT}
          />

          <motion.path
            d="M20 21a8 8 0 0 0-16 0"
            variants={PATH_VARIANT}
            transition={{
              delay: 0.2,
              duration: 0.4,
            }}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

UserIcon.displayName = 'UserIcon';

export { UserIcon };

/* -------------------------------------------------------------------------- */
/*                                   rabbit icon                               */
/* -------------------------------------------------------------------------- */

export interface RabbitIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RabbitIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.42, 0, 0.58, 1],
};

const SPEED_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    x: 0,
    y: 0,
  },
  animate: {
    rotate: [0, 5, -5, 3, -3, 0],
    x: [0, 3, -3, 2, -2, 0],
    y: [0, 1.5, -1.5, 1, -1, 0],
    transition: TRANSITION,
  },
};

const RabbitIcon = forwardRef<RabbitIconHandle, RabbitIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={SPEED_VARIANTS}
          animate={controls}
        >
          <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3" />
          <path d="M13 16a3 3 0 0 1 2.24 5" />
          <path d="M18 12h.01" />
          <path d="M20 8.54V4a2 2 0 1 0-4 0v3" />
          <path d="M7.612 12.524a3 3 0 1 0-1.6 4.3" />
        </motion.svg>
      </div>
    );
  }
);

RabbitIcon.displayName = 'RabbitIcon';

export { RabbitIcon };

/* -------------------------------------------------------------------------- */
/*                                   tazk icon                                  */
/* -------------------------------------------------------------------------- */


export interface ZapHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ZapProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const PATH_VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: {
      duration: 0.6,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      duration: 0.6,
      opacity: { duration: 0.1 },
    },
  },
};

const ZapIcon = forwardRef<ZapHandle, ZapProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size * 0.7}
          height={size}
          viewBox="0 0 16 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            variants={PATH_VARIANTS}
            animate={controls}
            d="M2 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 11 10h3a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 5 14z"
          />
        </svg>
      </div>
    );
  }
);

ZapIcon.displayName = 'ZapIcon';

export { ZapIcon };

/* -------------------------------------------------------------------------- */
/*                              LOADING ZAP ICON                               */
/* -------------------------------------------------------------------------- */

interface LoadingZapIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LOADING_ZAP_VARIANTS: Variants = {
  animate: {
    opacity: [0.4, 1, 0.4],
    scale: [0.95, 1.05, 0.95],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const LoadingZapIcon = forwardRef<HTMLDivElement, LoadingZapIconProps>(
  ({ className, size = 48, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size * 0.7}
          height={size}
          viewBox="0 0 16 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={LOADING_ZAP_VARIANTS}
          animate="animate"
          className="text-yellow-400"
        >
          <path
            d="M2 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 11 10h3a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 5 14z"
          />
        </motion.svg>
      </div>
    );
  }
);

LoadingZapIcon.displayName = 'LoadingZapIcon';

export { LoadingZapIcon };

/* -------------------------------------------------------------------------- */
/*                                 SEARCH ICON                                 */
/* -------------------------------------------------------------------------- */

export interface SearchIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SearchIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SEARCH_VARIANTS: Variants = {
  normal: {
    x: 0,
    y: 0,
    rotate: 0,
  },
  animate: {
    x: [0, -2, 2, -1, 1, 0],
    y: [0, -2, 0, -1, 0],
    rotate: [0, -10, 10, -5, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

const SearchIcon = forwardRef<SearchIconHandle, SearchIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={SEARCH_VARIANTS}
          animate={controls}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </motion.svg>
      </div>
    );
  }
);

SearchIcon.displayName = 'SearchIcon';

export { SearchIcon };

/* -------------------------------------------------------------------------- */
/*                                 CHART ICON                                  */
/* -------------------------------------------------------------------------- */

export interface ChartIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BAR_VARIANTS: Variants = {
  normal: { scaleY: 1 },
  animate: (i: number) => ({
    scaleY: [1, 1.3, 0.8, 1.1, 1],
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeInOut",
    },
  }),
};

const ChartIcon = forwardRef<ChartIconHandle, ChartIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.line
            x1="12"
            x2="12"
            y1="20"
            y2="10"
            variants={BAR_VARIANTS}
            animate={controls}
            custom={0}
            style={{ originY: 1 }}
          />
          <motion.line
            x1="18"
            x2="18"
            y1="20"
            y2="4"
            variants={BAR_VARIANTS}
            animate={controls}
            custom={1}
            style={{ originY: 1 }}
          />
          <motion.line
            x1="6"
            x2="6"
            y1="20"
            y2="14"
            variants={BAR_VARIANTS}
            animate={controls}
            custom={2}
            style={{ originY: 1 }}
          />
        </svg>
      </div>
    );
  }
);

ChartIcon.displayName = 'ChartIcon';

export { ChartIcon };

/* -------------------------------------------------------------------------- */
/*                                ACTIVITY ICON                                */
/* -------------------------------------------------------------------------- */

export interface ActivityIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ActivityIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ACTIVITY_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

const ActivityIcon = forwardRef<ActivityIconHandle, ActivityIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.path
            d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
            variants={ACTIVITY_VARIANTS}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

ActivityIcon.displayName = 'ActivityIcon';

export { ActivityIcon };

/* -------------------------------------------------------------------------- */
/*                                  BELL ICON                                  */
/* -------------------------------------------------------------------------- */

export interface BellIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BellIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BELL_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, 15, -15, 10, -10, 5, -5, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

const BellIcon = forwardRef<BellIconHandle, BellIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={BELL_VARIANTS}
          animate={controls}
          style={{ originX: 0.5, originY: 0 }}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </motion.svg>
      </div>
    );
  }
);

BellIcon.displayName = 'BellIcon';

export { BellIcon };

/* -------------------------------------------------------------------------- */
/*                                  LIST ICON                                  */
/* -------------------------------------------------------------------------- */

export interface ListIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ListIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LIST_LINE_VARIANTS: Variants = {
  normal: { x: 0, opacity: 1 },
  animate: (i: number) => ({
    x: [10, 0],
    opacity: [0, 1],
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

const ListIcon = forwardRef<ListIconHandle, ListIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.line x1="8" x2="21" y1="6" y2="6" variants={LIST_LINE_VARIANTS} animate={controls} custom={0} />
          <motion.line x1="8" x2="21" y1="12" y2="12" variants={LIST_LINE_VARIANTS} animate={controls} custom={1} />
          <motion.line x1="8" x2="21" y1="18" y2="18" variants={LIST_LINE_VARIANTS} animate={controls} custom={2} />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
      </div>
    );
  }
);

ListIcon.displayName = 'ListIcon';

export { ListIcon };

/* -------------------------------------------------------------------------- */
/*                                 KANBAN ICON                                 */
/* -------------------------------------------------------------------------- */

export interface KanbanIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface KanbanIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const KANBAN_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: (i: number) => ({
    y: [0, -3, 0],
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeInOut",
    },
  }),
};

const KanbanIcon = forwardRef<KanbanIconHandle, KanbanIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.rect width="6" height="14" x="4" y="5" rx="2" variants={KANBAN_VARIANTS} animate={controls} custom={0} />
          <motion.rect width="6" height="10" x="14" y="7" rx="2" variants={KANBAN_VARIANTS} animate={controls} custom={1} />
        </svg>
      </div>
    );
  }
);

KanbanIcon.displayName = 'KanbanIcon';

export { KanbanIcon };

/* -------------------------------------------------------------------------- */
/*                                CALENDAR ICON                                */
/* -------------------------------------------------------------------------- */

export interface CalendarIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CalendarIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CALENDAR_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

const CalendarIcon = forwardRef<CalendarIconHandle, CalendarIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={CALENDAR_VARIANTS}
          animate={controls}
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </motion.svg>
      </div>
    );
  }
);

CalendarIcon.displayName = 'CalendarIcon';

export { CalendarIcon };

/* -------------------------------------------------------------------------- */
/*                                SETTINGS ICON                                */
/* -------------------------------------------------------------------------- */

export interface SettingsIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SettingsIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SETTINGS_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: 180,
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

const SettingsIcon = forwardRef<SettingsIconHandle, SettingsIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={SETTINGS_VARIANTS}
          animate={controls}
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </motion.svg>
      </div>
    );
  }
);

SettingsIcon.displayName = 'SettingsIcon';

export { SettingsIcon };

/* -------------------------------------------------------------------------- */
/*                                 PALETTE ICON                                */
/* -------------------------------------------------------------------------- */

export interface PaletteIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PaletteIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const PALETTE_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

const PaletteIcon = forwardRef<PaletteIconHandle, PaletteIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={PALETTE_VARIANTS}
          animate={controls}
        >
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
        </motion.svg>
      </div>
    );
  }
);

PaletteIcon.displayName = 'PaletteIcon';

export { PaletteIcon };

/* -------------------------------------------------------------------------- */
/*                              PANEL LEFT CLOSE ICON                          */
/* -------------------------------------------------------------------------- */

export interface PanelLeftCloseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PanelLeftCloseIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const PANEL_CLOSE_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: {
    x: [-2, 0],
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const PanelLeftCloseIcon = forwardRef<PanelLeftCloseIconHandle, PanelLeftCloseIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <motion.path
            d="m16 15-3-3 3-3"
            variants={PANEL_CLOSE_VARIANTS}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

PanelLeftCloseIcon.displayName = 'PanelLeftCloseIcon';

export { PanelLeftCloseIcon };

/* -------------------------------------------------------------------------- */
/*                                 MAIL ICON                                   */
/* -------------------------------------------------------------------------- */

export interface MailIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MailIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const MAIL_VARIANTS: Variants = {
  normal: { y: 0, rotate: 0 },
  animate: {
    y: [-2, 0],
    rotate: [0, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const MailIcon = forwardRef<MailIconHandle, MailIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={MAIL_VARIANTS}
          animate={controls}
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </motion.svg>
      </div>
    );
  }
);

MailIcon.displayName = 'MailIcon';

export { MailIcon };

/* -------------------------------------------------------------------------- */
/*                                 USERS ICON                                  */
/* -------------------------------------------------------------------------- */

export interface UsersIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UsersIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const USERS_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: (i: number) => ({
    x: [i === 0 ? -2 : 2, 0],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  }),
};

const UsersIcon = forwardRef<UsersIconHandle, UsersIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            variants={USERS_VARIANTS}
            animate={controls}
            custom={0}
          />
          <motion.circle
            cx="9"
            cy="7"
            r="4"
            variants={USERS_VARIANTS}
            animate={controls}
            custom={0}
          />
          <motion.path
            d="M22 21v-2a4 4 0 0 0-3-3.87"
            variants={USERS_VARIANTS}
            animate={controls}
            custom={1}
          />
          <motion.path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            variants={USERS_VARIANTS}
            animate={controls}
            custom={1}
          />
        </svg>
      </div>
    );
  }
);

UsersIcon.displayName = 'UsersIcon';

export { UsersIcon };

/* -------------------------------------------------------------------------- */
/*                                 TRASH ICON                                  */
/* -------------------------------------------------------------------------- */

export interface TrashIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface TrashIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TRASH_LID_VARIANTS: Variants = {
  normal: { rotate: 0, y: 0 },
  animate: {
    rotate: [-15, 0],
    y: [-2, 0],
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const TRASH_BODY_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 0.95, 1],
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const TrashIcon = forwardRef<TrashIconHandle, TrashIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.g
            variants={TRASH_LID_VARIANTS}
            animate={controls}
            style={{ originX: 0.5, originY: 1 }}
          >
            <path d="M3 6h18" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </motion.g>
          <motion.path
            d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
            variants={TRASH_BODY_VARIANTS}
            animate={controls}
          />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      </div>
    );
  }
);

TrashIcon.displayName = 'TrashIcon';

export { TrashIcon };

/* -------------------------------------------------------------------------- */
/*                                 EDIT ICON                                   */
/* -------------------------------------------------------------------------- */

export interface EditIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EditIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const EDIT_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, -10, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

const EditIcon = forwardRef<EditIconHandle, EditIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={EDIT_VARIANTS}
          animate={controls}
          style={{ originX: 1, originY: 1 }}
        >
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          <path d="m15 5 4 4" />
        </motion.svg>
      </div>
    );
  }
);

EditIcon.displayName = 'EditIcon';

export { EditIcon };

/* -------------------------------------------------------------------------- */
/*                                 CHECK ICON                                  */
/* -------------------------------------------------------------------------- */

export interface CheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CHECK_VARIANTS: Variants = {
  normal: { pathLength: 1, opacity: 1 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const CheckIcon = forwardRef<CheckIconHandle, CheckIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <motion.path
            d="M20 6 9 17l-5-5"
            variants={CHECK_VARIANTS}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);

CheckIcon.displayName = 'CheckIcon';

export { CheckIcon };

/* -------------------------------------------------------------------------- */
/*                                 SAVE ICON                                   */
/* -------------------------------------------------------------------------- */

export interface SaveIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SaveIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SAVE_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: {
    y: [0, 2, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

const SaveIcon = forwardRef<SaveIconHandle, SaveIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
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
          <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <motion.path
            d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
            variants={SAVE_VARIANTS}
            animate={controls}
          />
          <path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </svg>
      </div>
    );
  }
);

SaveIcon.displayName = 'SaveIcon';

export { SaveIcon };

/* -------------------------------------------------------------------------- */
/*                               CLIPBOARD ICON                                */
/* -------------------------------------------------------------------------- */

export interface ClipboardIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ClipboardIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CLIPBOARD_VARIANTS: Variants = {
  normal: { y: 0, rotate: 0 },
  animate: {
    y: [-1, 0],
    rotate: [0, -3, 3, 0],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const ClipboardIcon = forwardRef<ClipboardIconHandle, ClipboardIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={CLIPBOARD_VARIANTS}
          animate={controls}
        >
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        </motion.svg>
      </div>
    );
  }
);

ClipboardIcon.displayName = 'ClipboardIcon';

export { ClipboardIcon };

/* -------------------------------------------------------------------------- */
/*                                  X ICON                                     */
/* -------------------------------------------------------------------------- */

export interface XIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface XIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const X_VARIANTS: Variants = {
  normal: { rotate: 0, scale: 1 },
  animate: {
    rotate: [0, 90],
    scale: [1, 0.9, 1],
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const XIcon = forwardRef<XIconHandle, XIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={X_VARIANTS}
          animate={controls}
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </motion.svg>
      </div>
    );
  }
);

XIcon.displayName = 'XIcon';

export { XIcon };

/* -------------------------------------------------------------------------- */
/*                                SHIELD ICON                                  */
/* -------------------------------------------------------------------------- */

export interface ShieldIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ShieldIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SHIELD_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const ShieldIcon = forwardRef<ShieldIconHandle, ShieldIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={SHIELD_VARIANTS}
          animate={controls}
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </motion.svg>
      </div>
    );
  }
);

ShieldIcon.displayName = 'ShieldIcon';

export { ShieldIcon };

/* -------------------------------------------------------------------------- */
/*                                CROWN ICON                                   */
/* -------------------------------------------------------------------------- */

export interface CrownIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CrownIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CROWN_VARIANTS: Variants = {
  normal: { y: 0, rotate: 0 },
  animate: {
    y: [-2, 0],
    rotate: [0, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const CrownIcon = forwardRef<CrownIconHandle, CrownIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={CROWN_VARIANTS}
          animate={controls}
        >
          <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
          <path d="M5 21h14" />
        </motion.svg>
      </div>
    );
  }
);

CrownIcon.displayName = 'CrownIcon';

export { CrownIcon };

/* -------------------------------------------------------------------------- */
/*                                 INFO ICON                                   */
/* -------------------------------------------------------------------------- */

export interface InfoIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface InfoIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const INFO_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const InfoIcon = forwardRef<InfoIconHandle, InfoIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={INFO_VARIANTS}
          animate={controls}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </motion.svg>
      </div>
    );
  }
);

InfoIcon.displayName = 'InfoIcon';

export { InfoIcon };

/* -------------------------------------------------------------------------- */
/*                            ALERT TRIANGLE ICON                              */
/* -------------------------------------------------------------------------- */

export interface AlertTriangleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AlertTriangleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ALERT_TRIANGLE_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const AlertTriangleIcon = forwardRef<AlertTriangleIconHandle, AlertTriangleIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={ALERT_TRIANGLE_VARIANTS}
          animate={controls}
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </motion.svg>
      </div>
    );
  }
);

AlertTriangleIcon.displayName = 'AlertTriangleIcon';

export { AlertTriangleIcon };

/* -------------------------------------------------------------------------- */
/*                                REPEAT ICON                                   */
/* -------------------------------------------------------------------------- */

export interface RepeatIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RepeatIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const REPEAT_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, -10, 360],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
    },
  },
};

const RepeatIcon = forwardRef<RepeatIconHandle, RepeatIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          variants={REPEAT_VARIANTS}
          animate={controls}
        >
          <path d="m17 2 4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="m7 22-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </motion.svg>
      </div>
    );
  }
);

RepeatIcon.displayName = 'RepeatIcon';

export { RepeatIcon };