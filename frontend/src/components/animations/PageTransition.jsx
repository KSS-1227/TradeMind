import React from "react";
import { motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, y: 10, filter: "blur(2px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(1px)",
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

export function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="page-transition-wrapper"
    >
      {children}
    </motion.div>
  );
}
