import React from "react";
import { motion } from "framer-motion";

export function MotionCard({ children, className = "", style = {}, onClick, ...props }) {
  return (
    <motion.div
      whileHover={onClick ? { y: -3, transition: { duration: 0.15 } } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      className={`card ${className}`}
      style={{ ...style, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}
