import React from "react";
import { motion } from "framer-motion";

/**
 * FadeIn — Smooth opacity transition
 */
export function FadeIn({
  children,
  duration = 0.3,
  delay = 0,
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`anim-fade-in ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideUp — Vertical Y-axis slide-in with fade
 */
export function SlideUp({
  children,
  distance = 20,
  duration = 0.4,
  delay = 0,
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -distance }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`anim-slide-up ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale — Spring zoom-in transition
 */
export function Scale({
  children,
  initialScale = 0.95,
  duration = 0.3,
  delay = 0,
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: initialScale }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`anim-scale ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * HoverLift — Hover spring elevation for cards/buttons
 */
export function HoverLift({
  children,
  y = -4,
  scale = 1.01,
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      whileHover={{ y, scale, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      className={`anim-hover-lift ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * CardReveal — Entrance reveal for grid & dashboard cards
 */
export function CardReveal({
  children,
  delay = 0,
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`anim-card-reveal ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * ListStagger — Container for staggered list item entrances
 */
export function ListStagger({
  children,
  staggerDelay = 0.05,
  className = "",
  style = {},
  ...props
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={`anim-list-stagger ${className}`.trim()}
      style={style}
      {...props}
    >
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * LoadingPulse — Pulsing glow component for loading states
 */
export function LoadingPulse({
  height = "40px",
  width = "100%",
  borderRadius = "var(--radius-md)",
  className = "",
  style = {},
  ...props
}) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`anim-loading-pulse ${className}`.trim()}
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: "var(--bg-elevated)",
        ...style,
      }}
      {...props}
    />
  );
}

export default {
  FadeIn,
  SlideUp,
  Scale,
  HoverLift,
  CardReveal,
  ListStagger,
  LoadingPulse,
};
